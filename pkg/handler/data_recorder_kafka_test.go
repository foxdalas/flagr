package handler

import (
	"sync"
	"testing"
	"time"

	"github.com/IBM/sarama"
	"github.com/foxdalas/flagr/swagger_gen/models"
	"github.com/prashantv/gostub"
	"github.com/stretchr/testify/assert"
)

type mockAsyncProducer struct {
	inputCh   chan *sarama.ProducerMessage
	successCh chan *sarama.ProducerMessage
	errorCh   chan *sarama.ProducerError
}

func (m *mockAsyncProducer) AsyncClose()                               {}
func (m *mockAsyncProducer) Close() error                              { return nil }
func (m *mockAsyncProducer) Input() chan<- *sarama.ProducerMessage     { return m.inputCh }
func (m *mockAsyncProducer) Successes() <-chan *sarama.ProducerMessage { return m.successCh }
func (m *mockAsyncProducer) Errors() <-chan *sarama.ProducerError      { return m.errorCh }
func (m *mockAsyncProducer) IsTransactional() bool                     { return false }
func (m *mockAsyncProducer) TxnStatus() sarama.ProducerTxnStatusFlag   { return 0 }
func (m *mockAsyncProducer) BeginTxn() error                           { return nil }
func (m *mockAsyncProducer) CommitTxn() error                          { return nil }
func (m *mockAsyncProducer) AbortTxn() error                           { return nil }
func (m *mockAsyncProducer) AddOffsetsToTxn(offsets map[string][]*sarama.PartitionOffsetMetadata, groupId string) error {
	return nil
}
func (m *mockAsyncProducer) AddMessageToTxn(msg *sarama.ConsumerMessage, groupId string, metadata *string) error {
	return nil
}

var _ sarama.AsyncProducer = (*mockAsyncProducer)(nil)

func TestNewKafkaRecorder(t *testing.T) {
	t.Run("no panics", func(t *testing.T) {
		errCh := make(chan *sarama.ProducerError)
		close(errCh)
		defer gostub.StubFunc(
			&saramaNewAsyncProducer,
			&mockAsyncProducer{
				inputCh: make(chan *sarama.ProducerMessage, 100),
				errorCh: errCh,
			},
			nil,
		).Reset()

		assert.NotPanics(t, func() { NewKafkaRecorder() })
	})
}

func TestCreateTLSConfiguration(t *testing.T) {
	t.Run("happy code path", func(t *testing.T) {
		tlsConfig := createTLSConfiguration(
			"./testdata/certificates/alice.crt",
			"./testdata/certificates/alice.key",
			"./testdata/certificates/ca.crt",
			true,
			false,
		)
		assert.NotZero(t, tlsConfig)

		tlsConfig = createTLSConfiguration(
			"",
			"",
			"",
			true,
			false,
		)
		assert.Zero(t, tlsConfig)

		tlsConfig = createTLSConfiguration(
			"",
			"",
			"",
			true,
			true,
		)
		assert.NotZero(t, tlsConfig)
	})

	t.Run("cert or key file not found", func(t *testing.T) {
		assert.Panics(t, func() {
			createTLSConfiguration(
				"./testdata/certificates/not_found.crt",
				"./testdata/certificates/not_found.key",
				"./testdata/certificates/ca.crt",
				true,
				false,
			)
		})
	})

	t.Run("ca file not found", func(t *testing.T) {
		assert.Panics(t, func() {
			createTLSConfiguration(
				"./testdata/certificates/alice.crt",
				"./testdata/certificates/alice.key",
				"./testdata/certificates/not_found.crt",
				true,
				false,
			)
		})
	})

	t.Run("simpleSSL takes precedence over cert+key", func(t *testing.T) {
		tlsConfig := createTLSConfiguration(
			"./testdata/certificates/alice.crt",
			"./testdata/certificates/alice.key",
			"",
			true,
			true,
		)
		assert.NotNil(t, tlsConfig)
		assert.Empty(t, tlsConfig.Certificates)
	})
}

func TestAsyncRecord(t *testing.T) {
	t.Run("happy code path - message flows through worker to producer", func(t *testing.T) {
		p := &mockAsyncProducer{inputCh: make(chan *sarama.ProducerMessage, 1)}
		kr := &kafkaRecorder{
			producer: p,
			topic:    "test-topic",
			recordCh: make(chan models.EvalResult, 10),
		}
		kr.startWorker()

		kr.AsyncRecord(models.EvalResult{})

		select {
		case r := <-p.inputCh:
			assert.NotNil(t, r)
			assert.Equal(t, "test-topic", r.Topic)
		case <-time.After(2 * time.Second):
			t.Fatal("timed out waiting for message on producer input")
		}

		close(kr.recordCh)
		kr.workerWg.Wait()
	})

	t.Run("non-blocking - does not block caller", func(t *testing.T) {
		p := &mockAsyncProducer{inputCh: make(chan *sarama.ProducerMessage, 100)}
		bufSize := 5
		kr := &kafkaRecorder{
			producer: p,
			topic:    "test-topic",
			recordCh: make(chan models.EvalResult, bufSize),
		}
		// Don't start worker — channel will fill up and then drop

		done := make(chan struct{})
		go func() {
			// Send bufSize+5 messages — first bufSize enqueue, rest drop, none block
			for i := 0; i < bufSize+5; i++ {
				kr.AsyncRecord(models.EvalResult{})
			}
			close(done)
		}()

		select {
		case <-done:
			// good — all calls returned without blocking
		case <-time.After(2 * time.Second):
			t.Fatal("AsyncRecord blocked — should be non-blocking")
		}

		assert.Equal(t, bufSize, len(kr.recordCh))
	})

	t.Run("drops when buffer is full", func(t *testing.T) {
		p := &mockAsyncProducer{inputCh: make(chan *sarama.ProducerMessage, 100)}
		bufSize := 3
		kr := &kafkaRecorder{
			producer: p,
			topic:    "test-topic",
			recordCh: make(chan models.EvalResult, bufSize),
		}
		// Don't start worker — let the buffer fill

		for i := 0; i < bufSize; i++ {
			kr.AsyncRecord(models.EvalResult{})
		}
		assert.Equal(t, bufSize, len(kr.recordCh))

		// This one should be dropped
		kr.AsyncRecord(models.EvalResult{})
		assert.Equal(t, bufSize, len(kr.recordCh), "buffer should not exceed capacity")
	})
}

func TestKafkaRecorderGracefulShutdown(t *testing.T) {
	t.Run("Close drains buffer and waits for worker", func(t *testing.T) {
		p := &mockAsyncProducer{inputCh: make(chan *sarama.ProducerMessage, 100)}
		kr := &kafkaRecorder{
			producer: p,
			topic:    "test-topic",
			recordCh: make(chan models.EvalResult, 100),
		}
		kr.startWorker()

		// Enqueue several records
		numRecords := 10
		for i := 0; i < numRecords; i++ {
			kr.AsyncRecord(models.EvalResult{})
		}

		// Close should drain all records and wait for worker
		err := kr.Close()
		assert.NoError(t, err)

		// All records should have been sent to the producer
		assert.Equal(t, numRecords, len(p.inputCh))
	})

	t.Run("Close with empty buffer completes quickly", func(t *testing.T) {
		p := &mockAsyncProducer{inputCh: make(chan *sarama.ProducerMessage, 100)}
		kr := &kafkaRecorder{
			producer: p,
			topic:    "test-topic",
			recordCh: make(chan models.EvalResult, 100),
		}
		kr.startWorker()

		done := make(chan struct{})
		go func() {
			kr.Close()
			close(done)
		}()

		select {
		case <-done:
			// good
		case <-time.After(2 * time.Second):
			t.Fatal("Close blocked on empty buffer")
		}
	})
}

func TestKafkaRecorderConcurrency(t *testing.T) {
	t.Run("concurrent AsyncRecord calls are safe", func(t *testing.T) {
		p := &mockAsyncProducer{inputCh: make(chan *sarama.ProducerMessage, 1000)}
		kr := &kafkaRecorder{
			producer: p,
			topic:    "test-topic",
			recordCh: make(chan models.EvalResult, 1000),
		}
		kr.startWorker()

		var wg sync.WaitGroup
		numGoroutines := 50
		numPerGoroutine := 20
		wg.Add(numGoroutines)
		for i := 0; i < numGoroutines; i++ {
			go func() {
				defer wg.Done()
				for j := 0; j < numPerGoroutine; j++ {
					kr.AsyncRecord(models.EvalResult{})
				}
			}()
		}
		wg.Wait()

		err := kr.Close()
		assert.NoError(t, err)

		assert.Equal(t, numGoroutines*numPerGoroutine, len(p.inputCh))
	})
}

func TestMustParseKafkaVersion(t *testing.T) {
	assert.NotPanics(t, func() {
		mustParseKafkaVersion("0.8.2.0")
		mustParseKafkaVersion("1.1.0") // for version >1.0, use 3 numbers
		mustParseKafkaVersion("2.1.0")
	})

	assert.Panics(t, func() {
		mustParseKafkaVersion("1.1.0.0") // for version >1.0, use 3 numbers
	})
}
