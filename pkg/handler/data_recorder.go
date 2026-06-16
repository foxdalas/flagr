package handler

import (
	"errors"
	"fmt"
	"sync"

	"github.com/foxdalas/flagr/pkg/config"
	"github.com/foxdalas/flagr/swagger_gen/models"
)

var (
	singletonDataRecorder     DataRecorder
	singletonDataRecorderOnce sync.Once
)

// DataRecorder can record and produce the evaluation result
type DataRecorder interface {
	AsyncRecord(models.EvalResult)
	NewDataRecordFrame(models.EvalResult) DataRecordFrame
	Close() error
}

// fanOutRecorder broadcasts AsyncRecord to multiple DataRecorder implementations.
type fanOutRecorder []DataRecorder

func (f fanOutRecorder) AsyncRecord(r models.EvalResult) {
	for _, rec := range f {
		rec.AsyncRecord(r)
	}
}

func (f fanOutRecorder) NewDataRecordFrame(_ models.EvalResult) DataRecordFrame {
	return DataRecordFrame{}
}

// Close closes every underlying recorder, joining any errors so a single
// failing backend does not prevent the others from shutting down cleanly.
func (f fanOutRecorder) Close() error {
	var errs []error
	for _, rec := range f {
		if err := rec.Close(); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

// GetDataRecorder gets the data recorder
func GetDataRecorder() DataRecorder {
	singletonDataRecorderOnce.Do(func() {
		if !config.Config.RecorderEnabled {
			singletonDataRecorder = fanOutRecorder(nil)
			return
		}

		var recs []DataRecorder
		for _, rt := range config.Config.RecorderType {
			switch rt {
			case "kafka":
				recs = append(recs, NewKafkaRecorder())
			case "kinesis":
				recs = append(recs, NewKinesisRecorder())
			case "pubsub":
				recs = append(recs, NewPubsubRecorder())
			case "datar":
				recs = append(recs, NewDatarRecorder())
			default:
				panic(fmt.Sprintf("recorderType %q not supported", rt))
			}
		}
		singletonDataRecorder = fanOutRecorder(recs)
	})

	return singletonDataRecorder
}

// CloseDataRecorder closes the singleton data recorder if it was initialized
func CloseDataRecorder() error {
	if singletonDataRecorder != nil {
		return singletonDataRecorder.Close()
	}
	return nil
}
