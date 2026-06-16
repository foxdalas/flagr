package handler

import (
	"github.com/foxdalas/flagr/pkg/datar"
	"github.com/foxdalas/flagr/swagger_gen/models"
)

// NewDatarRecorder creates a DataRecorder that feeds evaluation results into the Datar engine.
func NewDatarRecorder() DataRecorder {
	return &datarRecorder{engine: GetDatar()}
}

// datarRecorder wraps a datar.Engine as a DataRecorder.
// It feeds evaluation results into the in-memory aggregate buffer.
// Unlike Kafka/Kinesis/Pubsub recorders, it does not produce serialized
// frames — NewDataRecordFrame returns an empty frame.
type datarRecorder struct {
	engine *datar.Engine
}

func (d *datarRecorder) AsyncRecord(r models.EvalResult) {
	d.engine.Record(r.FlagID, r.VariantID, r.SegmentID)
}

func (d *datarRecorder) NewDataRecordFrame(_ models.EvalResult) DataRecordFrame {
	return DataRecordFrame{}
}

// Close is a no-op: the underlying datar.Engine lifecycle is owned by GetDatar
// and shut down via setupDatar's ServerShutdown hook, so closing it here would
// risk a double shutdown.
func (d *datarRecorder) Close() error {
	return nil
}
