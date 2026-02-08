package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/foxdalas/flagr/pkg/entity"
	"github.com/foxdalas/flagr/swagger_gen/models"
)

const ofrepPrefix = "/ofrep/v1/evaluate/flags"

// ofrepHandler handles OFREP protocol requests.
type ofrepHandler struct{}

func newOFREPHandler() *ofrepHandler {
	return &ofrepHandler{}
}

// WrapWithOFREP wraps the given handler with OFREP route interception.
func WrapWithOFREP(next http.Handler) http.Handler {
	ofrep := newOFREPHandler()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/ofrep/v1/") {
			ofrep.ServeHTTP(w, r)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ServeHTTP routes OFREP requests.
func (h *ofrepHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if rec := recover(); rec != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{
				"errorDetails": fmt.Sprintf("internal error: %v", rec),
			})
		}
	}()

	path := r.URL.Path

	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST")
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"errorDetails": "method not allowed, use POST",
		})
		return
	}

	if path == ofrepPrefix || path == ofrepPrefix+"/" {
		h.handleBulkEvaluate(w, r)
		return
	}

	if strings.HasPrefix(path, ofrepPrefix+"/") {
		key := path[len(ofrepPrefix)+1:]
		h.handleEvaluateFlag(w, r, key)
		return
	}

	writeJSON(w, http.StatusNotFound, map[string]any{"errorDetails": "not found"})
}

// ofrepEvalRequest is the OFREP evaluation request body (single and bulk).
type ofrepEvalRequest struct {
	Context map[string]any `json:"context"`
}

// ofrepEvalFailure is an OFREP single evaluation error response.
type ofrepEvalFailure struct {
	Key          string `json:"key"`
	ErrorCode    string `json:"errorCode"`
	ErrorDetails string `json:"errorDetails,omitempty"`
}

// ofrepBulkFailure is an OFREP bulk evaluation error response.
type ofrepBulkFailure struct {
	ErrorCode    string `json:"errorCode"`
	ErrorDetails string `json:"errorDetails,omitempty"`
}

// handleEvaluateFlag handles POST /ofrep/v1/evaluate/flags/{key}.
func (h *ofrepHandler) handleEvaluateFlag(w http.ResponseWriter, r *http.Request, key string) {
	var req ofrepEvalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ofrepEvalFailure{
			Key:       key,
			ErrorCode: "PARSE_ERROR",
		})
		return
	}

	targetingKey, err := validateContext(req.Context)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, ofrepEvalFailure{
			Key:       key,
			ErrorCode: err.Error(),
		})
		return
	}

	flag := GetEvalCache().GetByFlagKeyOrID(key)
	if flag == nil {
		writeJSON(w, http.StatusNotFound, ofrepEvalFailure{
			Key:       key,
			ErrorCode: "FLAG_NOT_FOUND",
		})
		return
	}

	evalContext := buildEvalContext(flag.Key, targetingKey, req.Context)
	evalResult := EvalFlagWithContext(flag, evalContext)

	resp := buildEvalResponse(flag, evalResult)
	writeJSON(w, http.StatusOK, resp)
}

// handleBulkEvaluate handles POST /ofrep/v1/evaluate/flags.
func (h *ofrepHandler) handleBulkEvaluate(w http.ResponseWriter, r *http.Request) {
	var req ofrepEvalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ofrepBulkFailure{
			ErrorCode: "PARSE_ERROR",
		})
		return
	}

	targetingKey, err := validateContext(req.Context)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, ofrepBulkFailure{
			ErrorCode: err.Error(),
		})
		return
	}

	cache := GetEvalCache()
	etag := cache.GetETag()
	w.Header().Set("ETag", etag)

	if ifNoneMatch := r.Header.Get("If-None-Match"); ifNoneMatch == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}

	flags := cache.GetAllEnabledFlags()
	entityContext := buildSharedEntityContext(req.Context)
	results := make([]any, 0, len(flags))

	for _, flag := range flags {
		evalContext := models.EvalContext{
			EntityID:      targetingKey,
			EntityContext: entityContext,
			FlagKey:       flag.Key,
		}
		evalResult := EvalFlagWithContext(flag, evalContext)
		results = append(results, buildEvalResponse(flag, evalResult))
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"flags": results,
	})
}

// validateContext validates the OFREP context and returns the targetingKey.
// Returns an error string matching OFREP error codes.
func validateContext(ctx map[string]any) (string, error) {
	if ctx == nil {
		return "", fmt.Errorf("INVALID_CONTEXT")
	}

	tk, ok := ctx["targetingKey"]
	if !ok {
		return "", fmt.Errorf("TARGETING_KEY_MISSING")
	}

	targetingKey, ok := tk.(string)
	if !ok || targetingKey == "" {
		return "", fmt.Errorf("TARGETING_KEY_MISSING")
	}

	return targetingKey, nil
}

// buildEvalContext creates a Flagr EvalContext from OFREP context.
func buildEvalContext(flagKey, targetingKey string, ctx map[string]any) models.EvalContext {
	entityContext := make(map[string]any, len(ctx))
	for k, v := range ctx {
		if k != "targetingKey" {
			entityContext[k] = v
		}
	}

	return models.EvalContext{
		EntityID:      targetingKey,
		EntityContext: entityContext,
		FlagKey:       flagKey,
	}
}

// buildSharedEntityContext creates an entityContext map that can be shared
// across multiple EvalContext instances in bulk evaluation. The map is built
// once and reused read-only — the eval engine never mutates EntityContext.
func buildSharedEntityContext(ctx map[string]any) map[string]any {
	entityContext := make(map[string]any, len(ctx))
	for k, v := range ctx {
		if k != "targetingKey" {
			entityContext[k] = v
		}
	}
	return entityContext
}

// buildEvalResponse converts a Flagr evaluation result into an OFREP success response.
func buildEvalResponse(flag *entity.Flag, evalResult *models.EvalResult) map[string]any {
	reason := determineReason(flag, evalResult)
	value, hasValue := extractValue(evalResult.VariantKey, evalResult.VariantAttachment)
	metadata := buildFlagMetadata(flag)

	return buildSuccessResponse(flag.Key, reason, evalResult.VariantKey, value, hasValue, metadata)
}

// buildSuccessResponse builds an OFREP success response as map[string]any.
// Using a map instead of a struct avoids omitempty issues with false, 0, "".
func buildSuccessResponse(key, reason, variant string, value any, hasValue bool, metadata map[string]any) map[string]any {
	resp := map[string]any{
		"key":    key,
		"reason": reason,
	}
	if variant != "" {
		resp["variant"] = variant
	}
	if hasValue {
		resp["value"] = value
	}
	if metadata != nil {
		resp["metadata"] = metadata
	}
	return resp
}

// determineReason derives the OFREP reason code from Flagr evaluation result.
func determineReason(flag *entity.Flag, evalResult *models.EvalResult) string {
	if !flag.Enabled {
		return "DISABLED"
	}

	seg := findMatchedSegment(flag, evalResult.SegmentID)
	if seg == nil {
		return "UNKNOWN"
	}

	if len(seg.Constraints) > 0 {
		return "TARGETING_MATCH"
	}

	if evalResult.VariantID != 0 && len(flag.Variants) == 1 {
		return "STATIC"
	}
	return "SPLIT"
}

// findMatchedSegment finds the segment by ID within a flag's segments.
func findMatchedSegment(flag *entity.Flag, segmentID int64) *entity.Segment {
	if segmentID == 0 {
		return nil
	}
	for i := range flag.Segments {
		if int64(flag.Segments[i].ID) == segmentID {
			return &flag.Segments[i]
		}
	}
	return nil
}

// extractValue extracts the typed value from a Flagr variant attachment.
// Convention: attachment should have a "value" field of the desired type.
// Fallback: if no attachment or no "value" field, returns variantKey as string.
func extractValue(variantKey string, variantAttachment any) (value any, hasValue bool) {
	var attachment entity.Attachment
	switch att := variantAttachment.(type) {
	case map[string]any:
		attachment = entity.Attachment(att)
	case entity.Attachment:
		attachment = att
	}

	if attachment == nil {
		if variantKey != "" {
			return variantKey, true
		}
		return nil, false
	}

	v, ok := attachment["value"]
	if !ok {
		if variantKey != "" {
			return variantKey, true
		}
		return nil, false
	}

	return v, true
}

// buildFlagMetadata builds OFREP metadata from flag properties and tags.
func buildFlagMetadata(flag *entity.Flag) map[string]any {
	if flag == nil {
		return nil
	}
	m := map[string]any{
		"flagId":      float64(flag.ID),
		"description": flag.Description,
	}
	for _, tag := range flag.Tags {
		m["tag:"+tag.Value] = true
	}
	return m
}

// writeJSON writes a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}
