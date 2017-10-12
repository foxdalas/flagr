package handler

import (
	"testing"

	"github.com/checkr/flagr/pkg/entity"
	"github.com/checkr/flagr/pkg/util"
	"github.com/checkr/flagr/swagger_gen/models"

	"github.com/prashantv/gostub"
	"github.com/stretchr/testify/assert"
)

func TestEvalSegment(t *testing.T) {
	t.Run("test empty evalContext", func(t *testing.T) {
		s := entity.GenFixtureSegment()
		vID, log, err := evalSegment(&models.EvalContext{}, s)

		assert.Nil(t, vID)
		assert.Empty(t, log)
		assert.Error(t, err)
	})

	t.Run("test happy code path", func(t *testing.T) {
		s := entity.GenFixtureSegment()
		s.RolloutPercent = uint(100)
		vID, log, err := evalSegment(&models.EvalContext{
			EnableDebug:   true,
			EntityContext: map[string]interface{}{"dl_state": "CA"},
			EntityID:      util.StringPtr("entityID1"),
			EntityType:    util.StringPtr("entityType1"),
			FlagID:        util.Int64Ptr(int64(100)),
		}, s)

		assert.NotNil(t, vID)
		assert.NotEmpty(t, log)
		assert.Nil(t, err)
	})

	t.Run("test constraint evaluation error", func(t *testing.T) {
		s := entity.GenFixtureSegment()
		s.RolloutPercent = uint(100)
		vID, log, err := evalSegment(&models.EvalContext{
			EnableDebug:   true,
			EntityContext: map[string]interface{}{},
			EntityID:      util.StringPtr("entityID1"),
			EntityType:    util.StringPtr("entityType1"),
			FlagID:        util.Int64Ptr(int64(100)),
		}, s)

		assert.Nil(t, vID)
		assert.Empty(t, log)
		assert.Error(t, err)
	})

	t.Run("test constraint not match", func(t *testing.T) {
		s := entity.GenFixtureSegment()
		s.RolloutPercent = uint(100)
		vID, log, err := evalSegment(&models.EvalContext{
			EnableDebug:   true,
			EntityContext: map[string]interface{}{"dl_state": "NY"},
			EntityID:      util.StringPtr("entityID1"),
			EntityType:    util.StringPtr("entityType1"),
			FlagID:        util.Int64Ptr(int64(100)),
		}, s)

		assert.Nil(t, vID)
		assert.NotEmpty(t, log)
		assert.Error(t, err)
	})

	t.Run("test evalContext wrong format", func(t *testing.T) {
		s := entity.GenFixtureSegment()
		s.RolloutPercent = uint(100)
		vID, log, err := evalSegment(&models.EvalContext{
			EnableDebug:   true,
			EntityContext: nil,
			EntityID:      util.StringPtr("entityID1"),
			EntityType:    util.StringPtr("entityType1"),
			FlagID:        util.Int64Ptr(int64(100)),
		}, s)

		assert.Nil(t, vID)
		assert.Empty(t, log)
		assert.Error(t, err)
	})
}

func TestEvalFlag(t *testing.T) {
	t.Run("test empty evalContext", func(t *testing.T) {
		defer gostub.StubFunc(&GetEvalCache, GenFixtureEvalCache()).Reset()
		result, err := evalFlag(&models.EvalContext{})
		assert.Nil(t, result)
		assert.Error(t, err)

		result, err = evalFlag(nil)
		assert.Nil(t, result)
		assert.Error(t, err)
	})

	t.Run("test happy code path", func(t *testing.T) {
		defer gostub.StubFunc(&GetEvalCache, GenFixtureEvalCache()).Reset()
		result, err := evalFlag(&models.EvalContext{
			EnableDebug:   true,
			EntityContext: map[string]interface{}{"dl_state": "CA"},
			EntityID:      util.StringPtr("entityID1"),
			EntityType:    util.StringPtr("entityType1"),
			FlagID:        util.Int64Ptr(int64(100)),
		})
		assert.NotNil(t, result)
		assert.Nil(t, err)
	})
}
