package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/foxdalas/flagr/pkg/entity"
	"github.com/foxdalas/flagr/swagger_gen/models"

	"github.com/prashantv/gostub"
	"github.com/stretchr/testify/assert"
)

func TestOFREPEvaluateFlag(t *testing.T) {
	defer gostub.StubFunc(&GetEvalCache, GenFixtureEvalCache()).Reset()
	defer gostub.StubFunc(&logEvalResult).Reset()

	h := newOFREPHandler()

	t.Run("happy path with constraint match", func(t *testing.T) {
		body := `{"context":{"targetingKey":"user-1","dl_state":"CA"}}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags/flag_key_100", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "flag_key_100", resp["key"])
		assert.Equal(t, "TARGETING_MATCH", resp["reason"])
		assert.NotEmpty(t, resp["variant"])
		assert.NotNil(t, resp["metadata"])
		assert.Empty(t, w.Header().Get("ETag"), "single eval should not have ETag")
	})

	t.Run("flag not found", func(t *testing.T) {
		body := `{"context":{"targetingKey":"user-1"}}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags/nonexistent", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "FLAG_NOT_FOUND", resp["errorCode"])
		assert.Equal(t, "nonexistent", resp["key"])
	})

	t.Run("missing targetingKey", func(t *testing.T) {
		body := `{"context":{}}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags/flag_key_100", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "TARGETING_KEY_MISSING", resp["errorCode"])
		assert.Equal(t, "flag_key_100", resp["key"])
	})

	t.Run("empty targetingKey", func(t *testing.T) {
		body := `{"context":{"targetingKey":""}}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags/flag_key_100", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "TARGETING_KEY_MISSING", resp["errorCode"])
	})

	t.Run("targetingKey not a string", func(t *testing.T) {
		body := `{"context":{"targetingKey":123}}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags/flag_key_100", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "TARGETING_KEY_MISSING", resp["errorCode"])
	})

	t.Run("missing context", func(t *testing.T) {
		body := `{}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags/flag_key_100", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "INVALID_CONTEXT", resp["errorCode"])
	})

	t.Run("invalid JSON", func(t *testing.T) {
		body := `{invalid`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags/flag_key_100", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "PARSE_ERROR", resp["errorCode"])
		assert.Equal(t, "flag_key_100", resp["key"])
	})

	t.Run("method not allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/ofrep/v1/evaluate/flags/flag_key_100", nil)
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
		assert.Equal(t, "POST", w.Header().Get("Allow"))
		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.NotEmpty(t, resp["errorDetails"])
		assert.Nil(t, resp["errorCode"], "405 should not have errorCode")
	})

	t.Run("url encoded flag key", func(t *testing.T) {
		body := `{"context":{"targetingKey":"user-1"}}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags/flag%5Fkey%5F100", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "flag_key_100", resp["key"])
	})
}

func TestOFREPBulkEvaluate(t *testing.T) {
	defer gostub.StubFunc(&GetEvalCache, GenFixtureEvalCache()).Reset()
	defer gostub.StubFunc(&logEvalResult).Reset()

	h := newOFREPHandler()

	t.Run("returns all enabled flags", func(t *testing.T) {
		body := `{"context":{"targetingKey":"user-1","dl_state":"CA"}}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.NotEmpty(t, w.Header().Get("ETag"))

		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		flags, ok := resp["flags"].([]any)
		assert.True(t, ok)
		assert.Greater(t, len(flags), 0)

		// Verify structure of individual flag in the array
		flagObj, ok := flags[0].(map[string]any)
		assert.True(t, ok)
		assert.NotEmpty(t, flagObj["key"])
		assert.NotEmpty(t, flagObj["reason"])
		assert.NotNil(t, flagObj["variant"], "bulk flag should have variant")
		assert.NotNil(t, flagObj["value"], "bulk flag should have value")
		assert.NotNil(t, flagObj["metadata"], "bulk flag should have metadata")
		meta, metaOk := flagObj["metadata"].(map[string]any)
		assert.True(t, metaOk)
		assert.NotNil(t, meta["flagId"])
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
	})

	t.Run("ETag header present", func(t *testing.T) {
		body := `{"context":{"targetingKey":"user-1"}}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		etag := w.Header().Get("ETag")
		assert.NotEmpty(t, etag)
		assert.True(t, etag[0] == '"' && etag[len(etag)-1] == '"', "ETag should be quoted")
	})

	t.Run("304 when ETag matches", func(t *testing.T) {
		body := `{"context":{"targetingKey":"user-1"}}`
		req1 := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags", bytes.NewBufferString(body))
		w1 := httptest.NewRecorder()
		h.ServeHTTP(w1, req1)
		etag := w1.Header().Get("ETag")

		req2 := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags", bytes.NewBufferString(body))
		req2.Header.Set("If-None-Match", etag)
		w2 := httptest.NewRecorder()
		h.ServeHTTP(w2, req2)

		assert.Equal(t, http.StatusNotModified, w2.Code)
		assert.Equal(t, 0, w2.Body.Len(), "304 must have empty body")
		assert.NotEmpty(t, w2.Header().Get("ETag"), "304 must include ETag per RFC 7232")
		assert.Equal(t, etag, w2.Header().Get("ETag"))
		assert.Empty(t, w2.Header().Get("Content-Type"), "304 should not set Content-Type")
	})

	t.Run("200 when ETag does not match", func(t *testing.T) {
		body := `{"context":{"targetingKey":"user-1"}}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags", bytes.NewBufferString(body))
		req.Header.Set("If-None-Match", `"stale-etag"`)
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("missing targetingKey", func(t *testing.T) {
		body := `{"context":{}}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "TARGETING_KEY_MISSING", resp["errorCode"])
		assert.Nil(t, resp["key"], "bulk error should not have key")
	})

	t.Run("invalid JSON", func(t *testing.T) {
		body := `not-json`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "PARSE_ERROR", resp["errorCode"])
		assert.Nil(t, resp["key"], "bulk error should not have key")
	})

	t.Run("missing context", func(t *testing.T) {
		body := `{}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "INVALID_CONTEXT", resp["errorCode"])
		assert.Nil(t, resp["key"], "bulk error should not have key")
	})

	t.Run("method not allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/ofrep/v1/evaluate/flags", nil)
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
		assert.Equal(t, "POST", w.Header().Get("Allow"))
		var resp map[string]any
		assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.NotEmpty(t, resp["errorDetails"])
		assert.Nil(t, resp["errorCode"], "405 should not have errorCode")
	})

	t.Run("trailing slash works", func(t *testing.T) {
		body := `{"context":{"targetingKey":"user-1"}}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags/", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		h.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestOFREPDetermineReason(t *testing.T) {
	t.Run("disabled flag", func(t *testing.T) {
		f := entity.GenFixtureFlag()
		f.Enabled = false
		result := &models.EvalResult{}
		assert.Equal(t, "DISABLED", determineReason(&f, result))
	})

	t.Run("no segment matched", func(t *testing.T) {
		f := entity.GenFixtureFlag()
		result := &models.EvalResult{SegmentID: 0}
		assert.Equal(t, "UNKNOWN", determineReason(&f, result))
	})

	t.Run("segment with constraints matched", func(t *testing.T) {
		f := entity.GenFixtureFlag()
		result := &models.EvalResult{
			SegmentID: 200,
			VariantID: 300,
		}
		assert.Equal(t, "TARGETING_MATCH", determineReason(&f, result))
	})

	t.Run("segment without constraints and single variant", func(t *testing.T) {
		f := entity.GenFixtureFlag()
		f.Segments[0].Constraints = nil
		f.Variants = []entity.Variant{f.Variants[0]}
		result := &models.EvalResult{
			SegmentID: 200,
			VariantID: 300,
		}
		assert.Equal(t, "STATIC", determineReason(&f, result))
	})

	t.Run("segment without constraints and multiple variants", func(t *testing.T) {
		f := entity.GenFixtureFlag()
		f.Segments[0].Constraints = nil
		result := &models.EvalResult{
			SegmentID: 200,
			VariantID: 300,
		}
		assert.Equal(t, "SPLIT", determineReason(&f, result))
	})

	t.Run("segment without constraints and no variant selected", func(t *testing.T) {
		f := entity.GenFixtureFlag()
		f.Segments[0].Constraints = nil
		result := &models.EvalResult{
			SegmentID: 200,
			VariantID: 0,
		}
		assert.Equal(t, "SPLIT", determineReason(&f, result))
	})
}

func TestOFREPExtractValue(t *testing.T) {
	t.Run("bool value true", func(t *testing.T) {
		att := entity.Attachment{"value": true}
		v, has := extractValue("key", att)
		assert.True(t, has)
		assert.Equal(t, true, v)
	})

	t.Run("bool value false preserved", func(t *testing.T) {
		att := entity.Attachment{"value": false}
		v, has := extractValue("key", att)
		assert.True(t, has)
		assert.Equal(t, false, v)
	})

	t.Run("string value", func(t *testing.T) {
		att := entity.Attachment{"value": "blue"}
		v, has := extractValue("key", att)
		assert.True(t, has)
		assert.Equal(t, "blue", v)
	})

	t.Run("empty string value preserved", func(t *testing.T) {
		att := entity.Attachment{"value": ""}
		v, has := extractValue("key", att)
		assert.True(t, has)
		assert.Equal(t, "", v)
	})

	t.Run("number value", func(t *testing.T) {
		att := entity.Attachment{"value": float64(42)}
		v, has := extractValue("key", att)
		assert.True(t, has)
		assert.Equal(t, float64(42), v)
	})

	t.Run("zero number value preserved", func(t *testing.T) {
		att := entity.Attachment{"value": float64(0)}
		v, has := extractValue("key", att)
		assert.True(t, has)
		assert.Equal(t, float64(0), v)
	})

	t.Run("object value", func(t *testing.T) {
		obj := map[string]any{"theme": "dark"}
		att := entity.Attachment{"value": obj}
		v, has := extractValue("key", att)
		assert.True(t, has)
		assert.Equal(t, obj, v)
	})

	t.Run("nil attachment with variantKey fallback", func(t *testing.T) {
		v, has := extractValue("control", nil)
		assert.True(t, has)
		assert.Equal(t, "control", v)
	})

	t.Run("nil attachment without variantKey", func(t *testing.T) {
		v, has := extractValue("", nil)
		assert.False(t, has)
		assert.Nil(t, v)
	})

	t.Run("attachment without value field uses variantKey", func(t *testing.T) {
		att := entity.Attachment{"color": "red"}
		v, has := extractValue("control", att)
		assert.True(t, has)
		assert.Equal(t, "control", v)
	})

	t.Run("attachment without value field and no variantKey", func(t *testing.T) {
		att := entity.Attachment{"color": "red"}
		v, has := extractValue("", att)
		assert.False(t, has)
		assert.Nil(t, v)
	})

	t.Run("map[string]any with value field", func(t *testing.T) {
		att := map[string]any{"value": "test"}
		v, has := extractValue("key", att)
		assert.True(t, has)
		assert.Equal(t, "test", v)
	})

	t.Run("map[string]any without value field", func(t *testing.T) {
		att := map[string]any{"other": "data"}
		v, has := extractValue("fallback", att)
		assert.True(t, has)
		assert.Equal(t, "fallback", v)
	})
}

func TestOFREPBuildFlagMetadata(t *testing.T) {
	t.Run("flag with tags", func(t *testing.T) {
		f := entity.GenFixtureFlag()
		m := buildFlagMetadata(&f)
		assert.Equal(t, float64(100), m["flagId"])
		assert.Equal(t, "", m["description"])
		assert.Equal(t, true, m["tag:tag1"])
		assert.Equal(t, true, m["tag:tag2"])
	})

	t.Run("nil flag", func(t *testing.T) {
		m := buildFlagMetadata(nil)
		assert.Nil(t, m)
	})
}

func TestOFREPWrapWithOFREP(t *testing.T) {
	defer gostub.StubFunc(&GetEvalCache, GenFixtureEvalCache()).Reset()
	defer gostub.StubFunc(&logEvalResult).Reset()

	fallbackCalled := false
	fallback := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fallbackCalled = true
		w.WriteHeader(http.StatusOK)
	})

	wrapped := WrapWithOFREP(fallback)

	t.Run("OFREP path goes to OFREP handler", func(t *testing.T) {
		fallbackCalled = false
		body := `{"context":{"targetingKey":"user-1"}}`
		req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags/flag_key_100", bytes.NewBufferString(body))
		w := httptest.NewRecorder()

		wrapped.ServeHTTP(w, req)

		assert.False(t, fallbackCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("non-OFREP path goes to fallback", func(t *testing.T) {
		fallbackCalled = false
		req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
		w := httptest.NewRecorder()

		wrapped.ServeHTTP(w, req)

		assert.True(t, fallbackCalled)
	})
}

func TestOFREPDisabledFlagEvaluation(t *testing.T) {
	f := entity.GenFixtureFlag()
	f.Enabled = false

	ec := &EvalCache{
		cache: &cacheContainer{
			idCache:  map[string]*entity.Flag{"100": &f},
			keyCache: map[string]*entity.Flag{f.Key: &f},
			tagCache: map[string]map[uint]*entity.Flag{},
		},
	}

	defer gostub.StubFunc(&GetEvalCache, ec).Reset()
	defer gostub.StubFunc(&logEvalResult).Reset()

	h := newOFREPHandler()

	body := `{"context":{"targetingKey":"user-1"}}`
	req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags/flag_key_100", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	h.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "flag_key_100", resp["key"])
	assert.Equal(t, "DISABLED", resp["reason"])
	// DISABLED flags should not have a value or variant
	_, hasValue := resp["value"]
	assert.False(t, hasValue)
	_, hasVariant := resp["variant"]
	assert.False(t, hasVariant, "DISABLED flag should not have variant")
}

func TestOFREPFindMatchedSegment(t *testing.T) {
	f := entity.GenFixtureFlag()

	t.Run("zero segmentID returns nil", func(t *testing.T) {
		assert.Nil(t, findMatchedSegment(&f, 0))
	})

	t.Run("valid segmentID returns segment", func(t *testing.T) {
		seg := findMatchedSegment(&f, 200)
		assert.NotNil(t, seg)
		assert.Equal(t, uint(200), seg.ID)
	})

	t.Run("unknown segmentID returns nil", func(t *testing.T) {
		assert.Nil(t, findMatchedSegment(&f, 999))
	})
}

func TestOFREPPanicRecovery(t *testing.T) {
	defer gostub.StubFunc(&GetEvalCache, GenFixtureEvalCache()).Reset()
	defer gostub.StubFunc(&logEvalResult).Reset()

	// Stub EvalFlagWithContext to panic
	origEval := EvalFlagWithContext
	EvalFlagWithContext = func(flag *entity.Flag, evalContext models.EvalContext) *models.EvalResult {
		panic("test panic")
	}
	defer func() { EvalFlagWithContext = origEval }()

	h := newOFREPHandler()

	body := `{"context":{"targetingKey":"user-1"}}`
	req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags/flag_key_100", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	h.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
	var resp map[string]any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Contains(t, resp["errorDetails"], "test panic")
	assert.Nil(t, resp["errorCode"], "500 generalErrorResponse should not have errorCode")
	assert.Nil(t, resp["key"], "500 generalErrorResponse should not have key")
}

func TestOFREPBuildSuccessResponse(t *testing.T) {
	t.Run("with all fields", func(t *testing.T) {
		resp := buildSuccessResponse("key1", "SPLIT", "variant1", "value1", true, map[string]any{"flagId": float64(1)})
		assert.Equal(t, "key1", resp["key"])
		assert.Equal(t, "SPLIT", resp["reason"])
		assert.Equal(t, "variant1", resp["variant"])
		assert.Equal(t, "value1", resp["value"])
		assert.NotNil(t, resp["metadata"])
	})

	t.Run("false value not omitted", func(t *testing.T) {
		resp := buildSuccessResponse("key1", "STATIC", "v", false, true, nil)
		assert.Equal(t, false, resp["value"])
	})

	t.Run("zero value not omitted", func(t *testing.T) {
		resp := buildSuccessResponse("key1", "STATIC", "v", float64(0), true, nil)
		assert.Equal(t, float64(0), resp["value"])
	})

	t.Run("empty string value not omitted", func(t *testing.T) {
		resp := buildSuccessResponse("key1", "STATIC", "v", "", true, nil)
		assert.Equal(t, "", resp["value"])
	})

	t.Run("no value when hasValue is false", func(t *testing.T) {
		resp := buildSuccessResponse("key1", "DISABLED", "", nil, false, nil)
		_, ok := resp["value"]
		assert.False(t, ok)
		_, ok = resp["variant"]
		assert.False(t, ok)
		_, ok = resp["metadata"]
		assert.False(t, ok)
	})
}

func TestOFREPValidateContext(t *testing.T) {
	t.Run("valid context", func(t *testing.T) {
		ctx := map[string]any{"targetingKey": "user-1", "plan": "premium"}
		tk, err := validateContext(ctx)
		assert.NoError(t, err)
		assert.Equal(t, "user-1", tk)
	})

	t.Run("nil context", func(t *testing.T) {
		_, err := validateContext(nil)
		assert.EqualError(t, err, "INVALID_CONTEXT")
	})

	t.Run("missing targetingKey", func(t *testing.T) {
		_, err := validateContext(map[string]any{})
		assert.EqualError(t, err, "TARGETING_KEY_MISSING")
	})

	t.Run("non-string targetingKey", func(t *testing.T) {
		_, err := validateContext(map[string]any{"targetingKey": 123})
		assert.EqualError(t, err, "TARGETING_KEY_MISSING")
	})

	t.Run("empty targetingKey", func(t *testing.T) {
		_, err := validateContext(map[string]any{"targetingKey": ""})
		assert.EqualError(t, err, "TARGETING_KEY_MISSING")
	})
}

func TestOFREPBuildEvalContext(t *testing.T) {
	ctx := map[string]any{"targetingKey": "user-1", "plan": "premium", "age": float64(25)}
	evalCtx := buildEvalContext("my-flag", "user-1", ctx)

	assert.Equal(t, "user-1", evalCtx.EntityID)
	assert.Equal(t, "my-flag", evalCtx.FlagKey)

	entityCtx, ok := evalCtx.EntityContext.(map[string]any)
	assert.True(t, ok)
	assert.Equal(t, "premium", entityCtx["plan"])
	assert.Equal(t, float64(25), entityCtx["age"])
	// targetingKey should NOT be in entityContext
	_, hasTargetingKey := entityCtx["targetingKey"]
	assert.False(t, hasTargetingKey)
}

func TestOFREPBuildSharedEntityContext(t *testing.T) {
	ctx := map[string]any{"targetingKey": "user-1", "plan": "premium", "age": float64(25)}
	entityCtx := buildSharedEntityContext(ctx)

	assert.Equal(t, "premium", entityCtx["plan"])
	assert.Equal(t, float64(25), entityCtx["age"])
	_, hasTargetingKey := entityCtx["targetingKey"]
	assert.False(t, hasTargetingKey, "targetingKey should be excluded")
	assert.Equal(t, 2, len(entityCtx))
}

func TestOFREPEvalCacheGetETag(t *testing.T) {
	ec := GenFixtureEvalCache()
	etag := ec.GetETag()
	// Default value should be "0" for test fixtures (no reloadMapCache called)
	assert.Equal(t, `"0"`, etag)
}

func TestOFREPEvalCacheGetAllEnabledFlags(t *testing.T) {
	ec := GenFixtureEvalCache()
	flags := ec.GetAllEnabledFlags()
	assert.Equal(t, 1, len(flags))
	assert.Equal(t, "flag_key_100", flags[0].Key)

	t.Run("disabled flags filtered out", func(t *testing.T) {
		f := entity.GenFixtureFlag()
		f.Enabled = false
		ec := &EvalCache{
			cache: &cacheContainer{
				idCache:  map[string]*entity.Flag{"100": &f},
				keyCache: map[string]*entity.Flag{f.Key: &f},
				tagCache: map[string]map[uint]*entity.Flag{},
			},
		}
		flags := ec.GetAllEnabledFlags()
		assert.Equal(t, 0, len(flags))
	})
}

func TestOFREPBulkDisabledFlagsExcluded(t *testing.T) {
	f := entity.GenFixtureFlag()
	f.Enabled = false

	ec := &EvalCache{
		cache: &cacheContainer{
			idCache:  map[string]*entity.Flag{"100": &f},
			keyCache: map[string]*entity.Flag{f.Key: &f},
			tagCache: map[string]map[uint]*entity.Flag{},
		},
	}

	defer gostub.StubFunc(&GetEvalCache, ec).Reset()
	defer gostub.StubFunc(&logEvalResult).Reset()

	h := newOFREPHandler()

	body := `{"context":{"targetingKey":"user-1"}}`
	req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	h.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	flags := resp["flags"].([]any)
	assert.Equal(t, 0, len(flags))
}

func TestOFREPUnknownPath(t *testing.T) {
	h := newOFREPHandler()

	req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/unknown", nil)
	w := httptest.NewRecorder()

	h.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
	var resp map[string]any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.NotEmpty(t, resp["errorDetails"])
}

func BenchmarkOFREPSingleEvaluate(b *testing.B) {
	defer gostub.StubFunc(&GetEvalCache, GenFixtureEvalCacheWithNFlags(20)).Reset()
	defer gostub.StubFunc(&logEvalResult).Reset()

	h := newOFREPHandler()
	body := []byte(`{"context":{"targetingKey":"user-1","dl_state":"CA"}}`)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodPost,
			"/ofrep/v1/evaluate/flags/flag_key_100", bytes.NewReader(body))
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)
	}
}

func BenchmarkOFREPBulkEvaluate(b *testing.B) {
	defer gostub.StubFunc(&GetEvalCache, GenFixtureEvalCacheWithNFlags(20)).Reset()
	defer gostub.StubFunc(&logEvalResult).Reset()

	h := newOFREPHandler()
	body := []byte(`{"context":{"targetingKey":"user-1","dl_state":"CA"}}`)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodPost,
			"/ofrep/v1/evaluate/flags", bytes.NewReader(body))
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)
	}
}

func BenchmarkOFREPBulkEvaluate304(b *testing.B) {
	defer gostub.StubFunc(&GetEvalCache, GenFixtureEvalCacheWithNFlags(20)).Reset()
	defer gostub.StubFunc(&logEvalResult).Reset()

	h := newOFREPHandler()
	body := []byte(`{"context":{"targetingKey":"user-1","dl_state":"CA"}}`)
	etag := GetEvalCache().GetETag()

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodPost,
			"/ofrep/v1/evaluate/flags", bytes.NewReader(body))
		req.Header.Set("If-None-Match", etag)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)
	}
}

func TestOFREPEvaluateFlagByID(t *testing.T) {
	defer gostub.StubFunc(&GetEvalCache, GenFixtureEvalCache()).Reset()
	defer gostub.StubFunc(&logEvalResult).Reset()

	h := newOFREPHandler()

	// Flag ID 100 should also work since GetByFlagKeyOrID supports both
	body := `{"context":{"targetingKey":"user-1","dl_state":"CA"}}`
	req := httptest.NewRequest(http.MethodPost, "/ofrep/v1/evaluate/flags/100", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	h.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "flag_key_100", resp["key"])
}
