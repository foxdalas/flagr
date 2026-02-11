package config

import (
	"fmt"
	"os"

	"github.com/DataDog/datadog-go/statsd"
	"github.com/caarlos0/env"
	"github.com/evalphobia/logrus_sentry"
	raven "github.com/getsentry/raven-go"
	"github.com/newrelic/go-agent/v3/newrelic"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/sirupsen/logrus"
)

// EvalOnlyModeDBDrivers is a list of DBDrivers that we should only run in EvalOnlyMode.
var EvalOnlyModeDBDrivers = map[string]struct{}{
	"json_file": {},
	"json_http": {},
}

// Global is the global dependency we can use, such as the new relic app instance
var Global = struct {
	NewrelicApp  *newrelic.Application
	StatsdClient *statsd.Client
	Prometheus   prometheusMetrics
}{}

func init() {
	env.Parse(&Config)

	setupEvalOnlyMode()
	setupSentry()
	setupLogrus()
	setupStatsd()
	setupNewrelic()
	setupPrometheus()
}

func setupEvalOnlyMode() {
	if _, ok := EvalOnlyModeDBDrivers[Config.DBDriver]; ok {
		Config.EvalOnlyMode = true
	}
}

func setupLogrus() {
	l, err := logrus.ParseLevel(Config.LogrusLevel)
	if err != nil {
		logrus.WithField("err", err).Fatalf("failed to set logrus level:%s", Config.LogrusLevel)
	}
	logrus.SetLevel(l)
	logrus.SetOutput(os.Stdout)
	switch Config.LogrusFormat {
	case "text":
		logrus.SetFormatter(&logrus.TextFormatter{})
	case "json":
		logrus.SetFormatter(&logrus.JSONFormatter{})
	default:
		logrus.Warnf("unexpected logrus format: %s, should be one of: text, json", Config.LogrusFormat)
	}
}

func setupSentry() {
	if Config.SentryEnabled {
		raven.SetDSN(Config.SentryDSN)
		hook, err := logrus_sentry.NewSentryHook(Config.SentryDSN, []logrus.Level{
			logrus.PanicLevel,
			logrus.FatalLevel,
			logrus.ErrorLevel,
		})
		if Config.SentryEnvironment != "" {
			hook.SetEnvironment(Config.SentryEnvironment)
		}
		if err != nil {
			logrus.WithField("err", err).Error("failed to hook logurs to sentry")
			return
		}
		logrus.StandardLogger().Hooks.Add(hook)
	}
}

func setupStatsd() {
	if Config.StatsdEnabled {
		client, err := statsd.New(fmt.Sprintf("%s:%s", Config.StatsdHost, Config.StatsdPort))
		if err != nil {
			panic(fmt.Sprintf("unable to initialize statsd. %s", err))
		}
		client.Namespace = Config.StatsdPrefix

		Global.StatsdClient = client
	}
}

func setupNewrelic() {
	if Config.NewRelicEnabled {
		app, err := newrelic.NewApplication(
			newrelic.ConfigAppName(Config.NewRelicAppName),
			newrelic.ConfigLicense(Config.NewRelicKey),
			newrelic.ConfigEnabled(true),
			newrelic.ConfigDistributedTracerEnabled(Config.NewRelicDistributedTracingEnabled),
		)
		if err != nil {
			panic(fmt.Sprintf("unable to initialize newrelic. %s", err))
		}
		Global.NewrelicApp = app
	}
}

type prometheusMetrics struct {
	ScrapePath       string
	EvalCounter      *prometheus.CounterVec
	RequestCounter   *prometheus.CounterVec
	RequestHistogram *prometheus.HistogramVec

	RecorderEnqueued      prometheus.Counter
	RecorderDropped       prometheus.Counter
	RecorderErrors        prometheus.Counter
	RecorderWorkerLatency prometheus.Histogram
	// RecorderBufferUsage — GaugeFunc, registered in kafkaRecorder (needs channel access)
}

func setupPrometheus() {
	if Config.PrometheusEnabled {
		Global.Prometheus.ScrapePath = Config.PrometheusPath
		Global.Prometheus.EvalCounter = promauto.NewCounterVec(prometheus.CounterOpts{
			Name: "flagr_eval_results",
			Help: "A counter of eval results",
		}, []string{"EntityType", "FlagID", "FlagKey", "VariantID", "VariantKey"})
		Global.Prometheus.RequestCounter = promauto.NewCounterVec(prometheus.CounterOpts{
			Name: "flagr_requests_total",
			Help: "The total http requests received",
		}, []string{"status", "path", "method"})

		if Config.PrometheusIncludeLatencyHistogram {
			Global.Prometheus.RequestHistogram = promauto.NewHistogramVec(prometheus.HistogramOpts{
				Name: "flagr_requests_buckets",
				Help: "A histogram of latencies for requests received",
			}, []string{"status", "path", "method"})
		}

		Global.Prometheus.RecorderEnqueued = promauto.NewCounter(prometheus.CounterOpts{
			Name: "flagr_recorder_enqueued_total",
			Help: "Total number of eval results enqueued for recording",
		})
		Global.Prometheus.RecorderDropped = promauto.NewCounter(prometheus.CounterOpts{
			Name: "flagr_recorder_dropped_total",
			Help: "Total number of eval results dropped due to full buffer",
		})
		Global.Prometheus.RecorderErrors = promauto.NewCounter(prometheus.CounterOpts{
			Name: "flagr_recorder_errors_total",
			Help: "Total number of Kafka producer errors",
		})
		Global.Prometheus.RecorderWorkerLatency = promauto.NewHistogram(prometheus.HistogramOpts{
			Name:    "flagr_recorder_worker_latency_seconds",
			Help:    "Latency of processing one record (serialization + Kafka send)",
			Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5},
		})
	}
}
