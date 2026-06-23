# OFREP (OpenFeature)

Flagr implements the **OpenFeature Remote Evaluation Protocol (OFREP)** — a vendor-neutral HTTP contract for flag evaluation. If you already use an [OpenFeature](https://openfeature.dev) SDK, point its OFREP provider at Flagr and evaluate flags through the standard OpenFeature API — no Flagr-specific client required.

OFREP is **enabled by default**. Disable it with `FLAGR_OFREP_ENABLED=false`.

| | |
|---|---|
| Single flag | `POST /ofrep/v1/evaluate/flags/{key}` |
| All flags (bulk) | `POST /ofrep/v1/evaluate/flags` |

Both endpoints are `POST` only (any other method returns `405`).

## Evaluate a single flag

`POST /ofrep/v1/evaluate/flags/{key}`

The body carries an OpenFeature evaluation **context**. `targetingKey` is required — it's the entity identifier Flagr uses for deterministic [rollout/distribution](flagr_overview); everything else becomes [constraint](flagr_operators) context.

```sh
curl -X POST http://localhost:18000/ofrep/v1/evaluate/flags/checkout-redesign \
  -H 'Content-Type: application/json' \
  -d '{ "context": { "targetingKey": "user-123", "state": "CA", "age": 31 } }'
```

Response (`200 OK`):

```json
{
  "key": "checkout-redesign",
  "reason": "TARGETING_MATCH",
  "variant": "treatment",
  "value": "treatment",
  "metadata": { "flagId": 42, "description": "New checkout flow", "tag:frontend": true }
}
```

| Field | Description |
|-------|-------------|
| `key` | The flag key. |
| `reason` | Why this result was returned (see below). |
| `variant` | The assigned variant key (omitted when there's no variant). |
| `value` | The resolved value (see **Resolving `value`** below). |
| `metadata` | Flag metadata: `flagId`, `description`, and a `tag:<value>: true` entry per tag. |

### Reason codes

| `reason` | Meaning |
|----------|---------|
| `TARGETING_MATCH` | Matched a segment that has constraints. |
| `SPLIT` | Matched a constraint-less segment and was assigned by distribution. |
| `STATIC` | Matched a **constraint-less** segment **and** the flag has exactly one variant — i.e. an unconditional, fixed result. (A single-variant flag whose matched segment *has* constraints returns `TARGETING_MATCH` instead.) |
| `DISABLED` | The flag is disabled. |
| `UNKNOWN` | No segment matched. |

### Resolving `value`

OpenFeature expects a typed value. Flagr resolves it from the variant's **attachment**:

- If the attachment has a `value` field, that field is returned (any JSON type — string, number, boolean, object).
- Otherwise the **variant key** is returned as the string value.

So to serve a typed flag (e.g. a number or boolean) over OpenFeature, give the variant an attachment like `{ "value": 42 }` or `{ "value": true }`. For a simple string flag, the variant key is enough.

## Evaluate all flags (bulk)

`POST /ofrep/v1/evaluate/flags`

Same context body; evaluates every **enabled** flag and returns them under `flags`:

```json
{
  "flags": [
    { "key": "checkout-redesign", "reason": "SPLIT", "variant": "control", "value": "control", "metadata": { "flagId": 42 } },
    { "key": "dark-mode", "reason": "DISABLED", "value": "off", "metadata": { "flagId": 43 } }
  ]
}
```

### Caching with ETag

The bulk endpoint returns an `ETag` that changes whenever flag configuration changes. Send it back as `If-None-Match` and Flagr replies `304 Not Modified` when nothing has changed — so an OpenFeature provider can poll cheaply and only refetch on real changes.

```sh
# First call returns an ETag header, e.g. ETag: "1718971200000"
curl -i -X POST http://localhost:18000/ofrep/v1/evaluate/flags \
  -H 'Content-Type: application/json' \
  -d '{ "context": { "targetingKey": "user-123" } }'

# Subsequent polls: 304 Not Modified (empty body) while config is unchanged
curl -i -X POST http://localhost:18000/ofrep/v1/evaluate/flags \
  -H 'Content-Type: application/json' \
  -H 'If-None-Match: "1718971200000"' \
  -d '{ "context": { "targetingKey": "user-123" } }'
```

## Errors

Failures use OpenFeature error codes. A single-flag error includes the `key`:

```json
{ "key": "checkout-redesign", "errorCode": "FLAG_NOT_FOUND" }
```

| `errorCode` | When |
|-------------|------|
| `PARSE_ERROR` | Request body is not valid JSON. |
| `INVALID_CONTEXT` | No `context` object provided. |
| `TARGETING_KEY_MISSING` | `context.targetingKey` is missing or empty. |
| `FLAG_NOT_FOUND` | Unknown flag key (single evaluation only). |

## OFREP vs. the native eval API

Both evaluate the same flags from the same engine. Use **OFREP** when you want to plug into the OpenFeature ecosystem and keep your code vendor-neutral; use the [native Evaluation API](flagr_eval_api) when you want Flagr's richer response (debug logs, segment IDs, snapshot IDs, batch over multiple entities).
