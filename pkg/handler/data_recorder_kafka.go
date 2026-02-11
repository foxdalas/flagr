package handler

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/foxdalas/flagr/pkg/config"
	"github.com/foxdalas/flagr/pkg/util"
	"github.com/foxdalas/flagr/swagger_gen/models"

	"github.com/IBM/sarama"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/sirupsen/logrus"
)

var (
	saramaNewAsyncProducer = sarama.NewAsyncProducer
)

func mustParseKafkaVersion(version string) sarama.KafkaVersion {
	v, err := sarama.ParseKafkaVersion(version)
	if err != nil {
		panic(err)
	}
	return v
}

// NewKafkaRecorder creates a new Kafka recorder
var NewKafkaRecorder = func() DataRecorder {
	if config.Config.RecorderKafkaVerbose {
		sarama.Logger = logrus.StandardLogger()
	}

	cfg := sarama.NewConfig()

	tlscfg := createTLSConfiguration(
		config.Config.RecorderKafkaCertFile,
		config.Config.RecorderKafkaKeyFile,
		config.Config.RecorderKafkaCAFile,
		config.Config.RecorderKafkaVerifySSL,
		config.Config.RecorderKafkaSimpleSSL,
	)
	if tlscfg != nil {
		cfg.Net.TLS.Enable = true
		cfg.Net.TLS.Config = tlscfg
	}

	if config.Config.RecorderKafkaSASLUsername != "" && config.Config.RecorderKafkaSASLPassword != "" {
		cfg.Net.SASL.Enable = true
		cfg.Net.SASL.User = config.Config.RecorderKafkaSASLUsername
		cfg.Net.SASL.Password = config.Config.RecorderKafkaSASLPassword
	}

	cfg.Net.MaxOpenRequests = config.Config.RecorderKafkaMaxOpenReqs

	cfg.Producer.Compression = sarama.CompressionCodec(config.Config.RecorderKafkaCompressionCodec)
	cfg.Producer.RequiredAcks = sarama.RequiredAcks(config.Config.RecorderKafkaRequiredAcks)
	cfg.Producer.Idempotent = config.Config.RecorderKafkaIdempotent
	cfg.Producer.Retry.Max = config.Config.RecorderKafkaRetryMax
	cfg.Producer.Flush.Frequency = config.Config.RecorderKafkaFlushFrequency
	cfg.Version = mustParseKafkaVersion(config.Config.RecorderKafkaVersion)

	if cfg.Producer.Idempotent {
		cfg.Producer.RequiredAcks = sarama.WaitForAll
		cfg.Net.MaxOpenRequests = 1
		if !cfg.Version.IsAtLeast(sarama.V0_11_0_0) {
			cfg.Version = sarama.V0_11_0_0
		}
		logrus.Info("Idempotent producer enabled: set RequiredAcks=WaitForAll, MaxOpenRequests=1, Version>=0.11.0.0")
	}

	brokerList := strings.Split(config.Config.RecorderKafkaBrokers, ",")
	producer, err := saramaNewAsyncProducer(brokerList, cfg)
	if err != nil {
		logrus.WithField("kafka_error", err).Fatal("Failed to start Sarama producer:")
	}

	var encryptor dataRecordEncryptor
	if config.Config.RecorderKafkaEncrypted && config.Config.RecorderKafkaEncryptionKey != "" {
		encryptor = newSimpleboxEncryptor(config.Config.RecorderKafkaEncryptionKey)
	}

	bufSize := config.Config.RecorderKafkaBufferSize
	if bufSize < 1 {
		bufSize = 10000
		logrus.Warn("RecorderKafkaBufferSize < 1, using default 10000")
	}

	workerCount := config.Config.RecorderKafkaWorkerCount
	if workerCount < 1 {
		workerCount = 4
		logrus.Warn("RecorderKafkaWorkerCount < 1, using default 4")
	}

	recorder := &kafkaRecorder{
		topic:               config.Config.RecorderKafkaTopic,
		partitionKeyEnabled: config.Config.RecorderKafkaPartitionKeyEnabled,
		producer:            producer,
		recordCh:            make(chan models.EvalResult, bufSize),
		options: DataRecordFrameOptions{
			Encrypted:       config.Config.RecorderKafkaEncrypted,
			Encryptor:       encryptor,
			FrameOutputMode: config.Config.RecorderFrameOutputMode,
		},
	}

	recorder.errWg.Add(1)
	go func() {
		defer recorder.errWg.Done()
		for err := range producer.Errors() {
			logrus.WithField("kafka_error", err).Error("failed to write access log entry")
			if config.Global.Prometheus.RecorderErrors != nil {
				config.Global.Prometheus.RecorderErrors.Inc()
			}
		}
	}()

	if config.Config.PrometheusEnabled {
		promauto.NewGaugeFunc(prometheus.GaugeOpts{
			Name: "flagr_recorder_buffer_usage",
			Help: "Current number of records in the async buffer",
		}, func() float64 {
			return float64(len(recorder.recordCh))
		})
	}

	for i := 0; i < workerCount; i++ {
		recorder.startWorker()
	}

	return recorder
}

func createTLSConfiguration(certFile string, keyFile string, caFile string, verifySSL bool, simpleSSL bool) (t *tls.Config) {
	if simpleSSL {
		t = &tls.Config{
			InsecureSkipVerify: !verifySSL,
		}
	} else if certFile != "" && keyFile != "" {
		cert, err := tls.LoadX509KeyPair(certFile, keyFile)
		if err != nil {
			logrus.WithField("TLSConfigurationError", err).Panic(err)
		}

		t = &tls.Config{
			Certificates:       []tls.Certificate{cert},
			InsecureSkipVerify: !verifySSL,
		}
	}

	if caFile != "" && t != nil {
		caCert, err := os.ReadFile(caFile)
		if err != nil {
			logrus.WithField("TLSConfigurationError", err).Panic(err)
		}

		caCertPool := x509.NewCertPool()
		caCertPool.AppendCertsFromPEM(caCert)
		t.RootCAs = caCertPool
	}
	// will be nil by default if nothing is provided
	return t
}

type kafkaRecorder struct {
	producer            sarama.AsyncProducer
	topic               string
	options             DataRecordFrameOptions
	partitionKeyEnabled bool
	recordCh            chan models.EvalResult
	workerWg            sync.WaitGroup
	errWg               sync.WaitGroup
}

func (k *kafkaRecorder) Close() error {
	close(k.recordCh)
	k.workerWg.Wait()
	err := k.producer.Close()
	k.errWg.Wait()
	return err
}

func (k *kafkaRecorder) NewDataRecordFrame(r models.EvalResult) DataRecordFrame {
	return DataRecordFrame{
		evalResult: r,
		options:    k.options,
	}
}

func (k *kafkaRecorder) AsyncRecord(r models.EvalResult) {
	select {
	case k.recordCh <- r:
		if config.Global.Prometheus.RecorderEnqueued != nil {
			config.Global.Prometheus.RecorderEnqueued.Inc()
		}
	default:
		if config.Global.Prometheus.RecorderDropped != nil {
			config.Global.Prometheus.RecorderDropped.Inc()
		}
	}
}

func (k *kafkaRecorder) startWorker() {
	k.workerWg.Add(1)
	go func() {
		defer k.workerWg.Done()
		for r := range k.recordCh {
			start := time.Now()

			frame := k.NewDataRecordFrame(r)
			output, err := frame.Output()
			if err != nil {
				logrus.WithField("err", err).Error("failed to generate data record frame for kafka recorder")
				continue
			}
			var partitionKey sarama.Encoder = nil
			if k.partitionKeyEnabled {
				partitionKey = sarama.StringEncoder(frame.GetPartitionKey())
			}
			k.producer.Input() <- &sarama.ProducerMessage{
				Topic:     k.topic,
				Key:       partitionKey,
				Value:     sarama.ByteEncoder(output),
				Timestamp: time.Now().UTC(),
			}

			logKafkaAsyncRecordToDatadog(r)

			if config.Global.Prometheus.RecorderWorkerLatency != nil {
				config.Global.Prometheus.RecorderWorkerLatency.Observe(time.Since(start).Seconds())
			}
		}
	}()
}

var logKafkaAsyncRecordToDatadog = func(r models.EvalResult) {
	if config.Global.StatsdClient == nil {
		return
	}
	config.Global.StatsdClient.Incr(
		"data_recorder.kafka",
		[]string{
			fmt.Sprintf("FlagID:%d", util.SafeUint(r.FlagID)),
		},
		float64(1),
	)
}
