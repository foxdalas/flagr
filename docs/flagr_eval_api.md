# Evaluation API

Evaluation is how your application asks Flagr *"for this entity, which variant of this flag is on?"* It's a plain HTTP request — no SDK required, though community SDKs exist for several languages.

!> Prefer the OpenFeature standard? Flagr also speaks [OFREP](flagr_ofrep) at `/ofrep/v1/...`, so you can use any OpenFeature SDK.

## Single evaluation

`POST /api/v1/evaluation`

```sh
curl -X POST http://localhost:18000/api/v1/evaluation \
  -H 'Content-Type: application/json' \
  -d '{
    "entityID": "user-123",
    "entityType": "user",
    "entityContext": { "state": "CA", "age": 31 },
    "flagKey": "checkout-redesign",
    "enableDebug": true
  }'
```

### Request fields

| Field | Type | Description |
|-------|------|-------------|
| `entityID` | string | Stable identifier for the entity. **Determines the rollout/distribution bucket** — the same `entityID` always gets the same variant. If omitted, Flagr generates a random one (non-sticky). |
| `entityType` | string | Optional label for the entity (e.g. `user`, `device`). Recorded with metrics. **If the flag itself has an Entity Type set, that value wins and overrides what you send here.** |
| `entityContext` | object | Attributes the segment [constraints](flagr_operators) are matched against. Constraint `property` names resolve against the keys *inside* `entityContext` — a constraint on `country` reads `entityContext.country`, not a top-level field. |
| `flagKey` | string | Identify the flag by key… |
| `flagID` | integer | …or by numeric ID. Either resolves to the same flag. |
| `enableDebug` | boolean | When `true`, the response includes `evalDebugLog` explaining why each segment did or didn't match. |

### Response fields

```json
{
  "flagID": 42,
  "flagKey": "checkout-redesign",
  "flagTags": ["checkout", "web"],
  "flagSnapshotID": 7,
  "segmentID": 100,
  "variantID": 200,
  "variantKey": "treatment",
  "variantAttachment": { "color": "#42b983" },
  "timestamp": "2026-06-22T12:00:00Z",
  "dataRecordsEnabled": false,
  "evalDebugLog": { "segmentDebugLogs": [], "msg": "" }
}
```

| Field | Description |
|-------|-------------|
| `variantKey` / `variantID` | The assigned variant. **Empty / `0` means no variant** — handle it as your default. |
| `variantAttachment` | The variant's JSON attachment, for [dynamic config](flagr_use_cases). |
| `segmentID` | Which segment matched (`0` if none). |
| `flagTags` | The matched flag's tags (echoed back, useful when you selected flags by tag). |
| `flagSnapshotID` | The flag revision used — handy for correlating with the [history](flagr_overview) tab. |
| `dataRecordsEnabled` | Whether this evaluation was logged to the metrics pipeline. |
| `evalDebugLog` | Per-segment match trace. Only populated when **both** `enableDebug: true` in the request **and** `FLAGR_EVAL_DEBUG_ENABLED=true` on the server (the default). |

Your code branches on `variantKey`:

```js
const res = await fetch(`${FLAGR}/api/v1/evaluation`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    entityID: userId,
    flagKey: "checkout-redesign",
    entityContext: { state },
  }),
}).then((r) => r.json());

if (res.variantKey === "treatment") {
  // new experience
} else {
  // control / default — also the path when no variant matched
}
```

!> **Always handle "no variant".** A disabled flag, an entity that matches no segment, or one that falls outside the rollout all return an empty `variantKey`. Treat that as your safe default. See [How Evaluation Works](flagr_evaluation).

## Batch evaluation

Evaluate many entities and/or many flags in one round-trip.

`POST /api/v1/evaluation/batch`

```json
{
  "entities": [
    { "entityID": "u1", "entityContext": { "state": "CA" } },
    { "entityID": "u2", "entityContext": { "state": "NY" } }
  ],
  "flagIDs": [42, 43],
  "enableDebug": false
}
```

The response is `{ "evaluationResults": [ ... ] }` with one `evalResult` per (entity × selected flag).

!> `FLAGR_EVAL_BATCH_SIZE` caps `entities × flags` to protect the server (default `0` = unlimited). Requests over the cap are rejected.

### GET batch (lambda-friendly)

`GET /api/v1/evaluation/batch` takes the selection via query parameters, for callers that can only issue GETs (CDNs, edge runtimes). It supports `ETag` / `If-None-Match`, so unchanged flag config returns `304 Not Modified` — cheap to poll.

The query-param names differ from the POST body and are all repeatable (multi-value):

| Query param | Maps to |
|-------------|---------|
| `entityId` | the entity ID (single entity per request) |
| `flagId` / `flagKey` | select flags by ID or key |
| `flagTag` | select flags by tag (repeat for several) |
| `flagTagQuery` | `ANY` (default) or `ALL` — how `flagTag` values combine |

Two GET-only limitations vs. POST batch:

- **One entity per request** (`entityId`), and its **`entityType` is always `user`** — you can't set a custom entity type on the GET form.
- Entity context is passed as extra query params (each becomes a context key).

## Selecting which flags to evaluate

Pick one of:

- **`flagKey`** / **`flagKeys`** — most readable; stable across environments.
- **`flagID`** / **`flagIDs`** — numeric; matches the flag's UI URL.
- **`flagTags`** with **`flagTagsOperator`** — evaluate every flag carrying these tags. `ANY` (default) = has at least one of the tags; `ALL` = has all of them. Ideal for "evaluate every flag for this surface."

!> **Tag selection is batch-only.** Single `POST /api/v1/evaluation` resolves a flag by `flagID`/`flagKey` only — it ignores `flagTags`. To evaluate by tag, use the batch endpoint.

## Determinism: send a stable entityID

Rollout and distribution are deterministic in `entityID`: the same entity always lands in the same bucket, so a user keeps the same variant across requests and restarts. Send a **stable** identifier (user ID, account ID, device ID) — not a per-request random value — or the sticky behavior is lost. See [Overview → Rollout](flagr_overview).

## Read-only evaluation nodes

For high-traffic setups, run dedicated evaluation instances with `FLAGR_EVAL_ONLY_MODE=true`: they serve `/api/v1/evaluation*` (and [OFREP](flagr_ofrep)) from the in-memory cache and disable the CRUD/management API. Pair them with a separate management instance that owns writes.

## Client libraries

Community SDKs (Go, JavaScript, Python, Ruby) wrap these endpoints — see the project README. For OpenFeature, point any OpenFeature SDK at Flagr's [OFREP](flagr_ofrep) endpoint; no Flagr-specific client is needed.
