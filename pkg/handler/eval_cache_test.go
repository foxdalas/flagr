package handler

import (
	"slices"
	"testing"

	"github.com/foxdalas/flagr/pkg/config"
	"github.com/foxdalas/flagr/pkg/entity"
	"github.com/foxdalas/flagr/pkg/notification"
	"github.com/foxdalas/flagr/swagger_gen/models"
	"github.com/foxdalas/flagr/swagger_gen/restapi/operations/export"
	"github.com/newrelic/go-agent/v3/newrelic"

	"github.com/prashantv/gostub"
	"github.com/stretchr/testify/assert"
)

func TestGetByFlagKeyOrID(t *testing.T) {
	fixtureFlag := entity.GenFixtureFlag()
	db := entity.PopulateTestDB(fixtureFlag)

	tmpDB, dbErr := db.DB()
	if dbErr != nil {
		t.Errorf("Failed to get database")
	}

	defer tmpDB.Close()
	defer gostub.StubFunc(&getDB, db).Reset()

	ec := GetEvalCache()
	ec.lastSnapshotMaxID = 0
	ec.reloadMapCache()
	f := ec.GetByFlagKeyOrID(fixtureFlag.ID)
	assert.Equal(t, f.ID, fixtureFlag.ID)
	assert.Equal(t, f.Tags[0].Value, fixtureFlag.Tags[0].Value)
}

func TestGetByTags(t *testing.T) {
	fixtureFlag := entity.GenFixtureFlag()
	db := entity.PopulateTestDB(fixtureFlag)

	tmpDB, dbErr := db.DB()
	if dbErr != nil {
		t.Errorf("Failed to get database")
	}

	defer tmpDB.Close()
	defer gostub.StubFunc(&getDB, db).Reset()

	ec := GetEvalCache()
	ec.lastSnapshotMaxID = 0
	ec.reloadMapCache()

	tags := make([]string, len(fixtureFlag.Tags))
	for i, s := range fixtureFlag.Tags {
		tags[i] = s.Value
	}
	any := models.EvalContextFlagTagsOperatorANY
	all := models.EvalContextFlagTagsOperatorALL
	f := ec.GetByTags(tags, &any)
	assert.Len(t, f, 1)
	assert.Equal(t, f[0].ID, fixtureFlag.ID)
	assert.Equal(t, f[0].Tags[0].Value, fixtureFlag.Tags[0].Value)

	tags = make([]string, len(fixtureFlag.Tags)+1)
	for i, s := range fixtureFlag.Tags {
		tags[i] = s.Value
	}
	tags[len(tags)-1] = "tag3"

	f = ec.GetByTags(tags, &any)
	assert.Len(t, f, 1)

	var operator *string
	f = ec.GetByTags(tags, operator)
	assert.Len(t, f, 1)

	f = ec.GetByTags(tags, &all)
	assert.Len(t, f, 0)
}

// countingFetcher wraps an evalCacheFetcher and counts fetch calls.
type countingFetcher struct {
	wrapped evalCacheFetcher
	count   int
}

func (c *countingFetcher) fetch() ([]entity.Flag, error) {
	c.count++
	return c.wrapped.fetch()
}

func TestReloadMapCacheShortCircuit(t *testing.T) {
	fixtureFlag := entity.GenFixtureFlag()
	db := entity.PopulateTestDB(fixtureFlag)

	tmpDB, dbErr := db.DB()
	if dbErr != nil {
		t.Fatalf("Failed to get database")
	}
	defer tmpDB.Close()
	defer gostub.StubFunc(&getDB, db).Reset()

	// Create an initial snapshot so MAX(id) > 0 and the short-circuit
	// guard (lastSnapshotMaxID > 0) can engage.
	entity.SaveFlagSnapshot(db, fixtureFlag.ID, "test",
		notification.OperationCreate, notification.ComponentFlag, fixtureFlag.ID, fixtureFlag.Key)

	ec := GetEvalCache()
	ec.lastSnapshotMaxID = 0

	// Set a spy fetcher to count how many times fetch is called.
	spy := &countingFetcher{wrapped: &dbFetcher{db: db}}
	ec.fetcher = spy

	// 1st call: must fetch (no prior MAX id tracked).
	err := ec.reloadMapCache()
	assert.NoError(t, err)
	assert.Equal(t, 1, spy.count, "first call should fetch full data")
	assert.Greater(t, ec.lastSnapshotMaxID, uint(0), "should track snapshot max ID")

	// 2nd call: must short-circuit (no new snapshot created).
	err = ec.reloadMapCache()
	assert.NoError(t, err)
	assert.Equal(t, 1, spy.count, "second call should short-circuit")
	assert.Equal(t, ec.lastSnapshotMaxID, ec.lastSnapshotMaxID,
		"snapshot max ID must not change when no new snapshot exists")

	// Create another snapshot to simulate a mutation via the API.
	entity.SaveFlagSnapshot(db, fixtureFlag.ID, "test",
		notification.OperationUpdate, notification.ComponentFlag, fixtureFlag.ID, fixtureFlag.Key)

	// 3rd call: must fetch again (new snapshot invalidated the cache).
	err = ec.reloadMapCache()
	assert.NoError(t, err)
	assert.Equal(t, 2, spy.count, "third call should fetch (new snapshot)")
}

func TestReloadMapCacheWithNewRelic(t *testing.T) {
	fixtureFlag := entity.GenFixtureFlag()
	db := entity.PopulateTestDB(fixtureFlag)

	tmpDB, dbErr := db.DB()
	if dbErr != nil {
		t.Fatalf("Failed to get database")
	}

	defer tmpDB.Close()
	defer gostub.StubFunc(&getDB, db).Reset()

	// Noop NR application — valid *Application with no goroutines or data collection
	app, err := newrelic.NewApplication(newrelic.ConfigEnabled(false))
	assert.NoError(t, err)

	// Save & restore config
	origEnabled := config.Config.NewRelicEnabled
	origApp := config.Global.NewrelicApp
	defer func() {
		config.Config.NewRelicEnabled = origEnabled
		config.Global.NewrelicApp = origApp
	}()

	// Enable NewRelic path with noop app
	config.Config.NewRelicEnabled = true
	config.Global.NewrelicApp = app

	ec := GetEvalCache()
	assert.NotPanics(t, func() {
		err := ec.reloadMapCache()
		assert.NoError(t, err)
	})
}

func TestEvalCacheExport(t *testing.T) {
	ec := GenFixtureEvalCacheWithFlags([]entity.Flag{
		entity.GenFixtureFlagWithTags(1, "first", true, []string{"tag1", "tag2"}),
		entity.GenFixtureFlagWithTags(2, "second", true, []string{"tag2", "tag3"}),
		entity.GenFixtureFlagWithTags(3, "third", false, []string{"tag2", "tag3"}),
		entity.GenFixtureFlagWithTags(4, "fourth", true, []string{}),
	})

	t.Run("should be able to query cache via flag ids", func(t *testing.T) {
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{Ids: []int64{1, 3}}).Flags
		assert.Len(t, exportedFlags, 2)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(1)))
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(3)))
	})

	t.Run("should be able to query cache via flag keys", func(t *testing.T) {
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{Keys: []string{"second", "fourth"}}).Flags
		assert.Len(t, exportedFlags, 2)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(2)))
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(4)))
	})

	t.Run("should be able to query cache via enabled property", func(t *testing.T) {
		tru := true
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{Enabled: &tru}).Flags
		assert.Len(t, exportedFlags, 3)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(1)))
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(2)))
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(4)))

		fals := false
		exportedFlags = ec.export(export.GetExportEvalCacheJSONParams{Enabled: &fals}).Flags
		assert.Len(t, exportedFlags, 1)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(3)))
	})

	t.Run("should be able to query cache via tags with default ANY semantics", func(t *testing.T) {
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{Tags: []string{"tag1", "tag2"}}).Flags
		assert.Len(t, exportedFlags, 3)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(1)))
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(2)))
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(3)))

		fals := false
		exportedFlags = ec.export(export.GetExportEvalCacheJSONParams{All: &fals, Tags: []string{"tag1", "tag2"}}).Flags
		assert.Len(t, exportedFlags, 3)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(1)))
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(2)))
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(3)))
	})

	t.Run("should be able to query cache via tags with ALL semantics", func(t *testing.T) {
		tru := true
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{All: &tru, Tags: []string{"tag1", "tag2"}}).Flags
		assert.Len(t, exportedFlags, 1)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(1)))
	})

	t.Run("flag ids query should have precedence over other queries", func(t *testing.T) {
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{Ids: []int64{4}, Keys: []string{"first", "second"}}).Flags
		assert.Len(t, exportedFlags, 1)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(4)))

		fals := false
		exportedFlags = ec.export(export.GetExportEvalCacheJSONParams{Ids: []int64{4}, Enabled: &fals}).Flags
		assert.Len(t, exportedFlags, 1)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(4)))

		exportedFlags = ec.export(export.GetExportEvalCacheJSONParams{Ids: []int64{4}, Tags: []string{"tag1"}}).Flags
		assert.Len(t, exportedFlags, 1)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(4)))
	})

	t.Run("flag keys query should have precedence over enabled and tags queries", func(t *testing.T) {
		fals := false
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{Keys: []string{"fourth"}, Enabled: &fals}).Flags
		assert.Len(t, exportedFlags, 1)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(4)))

		exportedFlags = ec.export(export.GetExportEvalCacheJSONParams{Keys: []string{"fourth"}, Tags: []string{"tag1"}}).Flags
		assert.Len(t, exportedFlags, 1)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(4)))
	})

	t.Run("should return empty for nonexistent ids", func(t *testing.T) {
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{Ids: []int64{999}}).Flags
		assert.Empty(t, exportedFlags)
	})

	t.Run("should return empty for nonexistent keys", func(t *testing.T) {
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{Keys: []string{"nonexistent"}}).Flags
		assert.Empty(t, exportedFlags)
	})

	t.Run("should return empty for nonexistent tags with ANY", func(t *testing.T) {
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{Tags: []string{"tag99"}}).Flags
		assert.Empty(t, exportedFlags)
	})

	t.Run("should return empty for ALL when one tag missing", func(t *testing.T) {
		tru := true
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{All: &tru, Tags: []string{"tag1", "tag99"}}).Flags
		assert.Empty(t, exportedFlags)
	})

	t.Run("should return all flags when no filters", func(t *testing.T) {
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{}).Flags
		assert.Len(t, exportedFlags, 4)
	})

	t.Run("should deduplicate ids", func(t *testing.T) {
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{Ids: []int64{1, 1, 1}}).Flags
		assert.Len(t, exportedFlags, 1)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(1)))
	})

	t.Run("should be able to combine enabled and tags queries", func(t *testing.T) {
		tru := true
		exportedFlags := ec.export(export.GetExportEvalCacheJSONParams{Enabled: &tru, Tags: []string{"tag2"}}).Flags
		assert.Len(t, exportedFlags, 2)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(1)))
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(2)))

		fals := false
		exportedFlags = ec.export(export.GetExportEvalCacheJSONParams{Enabled: &fals, Tags: []string{"tag2"}}).Flags
		assert.Len(t, exportedFlags, 1)
		assert.True(t, slices.ContainsFunc(exportedFlags, withID(3)))
	})
}

func withID(id uint) func(entity.Flag) bool {
	return func(f entity.Flag) bool {
		return f.ID == id
	}
}
