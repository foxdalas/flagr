# Management API

Everything you do in the UI — create a flag, add variants and segments, edit constraints, set a distribution, toggle a flag on — is a REST call you can also make directly. This is the API to use for **automation, CI/CD, scripting, and seeding environments**. (To *evaluate* flags from your application, use the [Evaluation API](flagr_eval_api) instead.)

- **Base path:** `/api/v1`
- **Content type:** `application/json`
- **Full schema:** the interactive [API reference](api) (`/api_docs`) lists every endpoint, field, and response — this page is the practical guide.

!> The management API is **not exposed** on [eval-only nodes](flagr_eval_api) (`FLAGR_EVAL_ONLY_MODE=true`). Run it against your management instance. Lock the management instance down with [authentication](flagr_deployment) — by default these write endpoints are open.

## The resource hierarchy

A flag owns everything under it:

```
flag
├── variants        (the possible return values)
├── tags            (labels for search & tag-based eval)
└── segments        (ordered targeting rules)
    ├── constraints (who is in the segment — combined with AND)
    └── distribution (how matched traffic splits across variants)
```

Each level has its own endpoints, always nested under the parent flag.

## Flags

| Method & path | Purpose |
|---|---|
| `GET /flags` | List flags. Filters: `enabled`, `description`, `tags`, `key`, `deleted`, `preload`, `limit`, `offset` |
| `POST /flags` | Create a flag (`description`, optional `key`) |
| `GET /flags/{flagID}` | Fetch one flag with all its children |
| `PUT /flags/{flagID}` | Update `description`, `key`, `dataRecordsEnabled`, `entityType`, `notes` |
| `PUT /flags/{flagID}/enabled` | Turn the flag on/off (`{"enabled": true}`) — the kill switch |
| `DELETE /flags/{flagID}` | Soft-delete the flag |
| `PUT /flags/{flagID}/restore` | Restore a soft-deleted flag |
| `GET /flags/entity_types` | List the distinct entity types in use |

```bash
# Create a flag, then read it back
curl -X POST http://localhost:18000/api/v1/flags \
  -H 'Content-Type: application/json' \
  -d '{"description": "New checkout flow", "key": "checkout-redesign"}'
# → { "id": 42, "key": "checkout-redesign", ... }
```

!> Creating a flag does **not** enable it. A new flag is disabled and returns no variant until you add variants/segments/a distribution and call `.../enabled`.

## Variants

| Method & path | Purpose |
|---|---|
| `GET /flags/{flagID}/variants` | List variants |
| `POST /flags/{flagID}/variants` | Create a variant (`key`, optional `attachment`) |
| `PUT /flags/{flagID}/variants/{variantID}` | Update key / attachment |
| `DELETE /flags/{flagID}/variants/{variantID}` | Delete a variant |

```bash
curl -X POST http://localhost:18000/api/v1/flags/42/variants \
  -H 'Content-Type: application/json' \
  -d '{"key": "treatment", "attachment": {"color": "#22c55e"}}'
```

The `attachment` is arbitrary JSON returned alongside the variant at eval time — see [dynamic configuration](flagr_use_cases).

## Segments

Segments are evaluated **in order**; the first whose constraints match wins (see [How Evaluation Works](flagr_evaluation)).

| Method & path | Purpose |
|---|---|
| `GET /flags/{flagID}/segments` | List segments in evaluation order |
| `POST /flags/{flagID}/segments` | Create a segment (`description`, `rolloutPercent`) |
| `PUT /flags/{flagID}/segments/{segmentID}` | Update description / rollout |
| `DELETE /flags/{flagID}/segments/{segmentID}` | Delete a segment (and its constraints/distribution) |
| `PUT /flags/{flagID}/segments/reorder` | Reorder by ID: `{"segmentIDs": [3, 1, 2]}` |

## Constraints

Constraints define *who* is in a segment; all of a segment's constraints combine with `AND`. See [Constraint Operators](flagr_operators) for the operator/value rules.

| Method & path | Purpose |
|---|---|
| `GET /flags/{flagID}/segments/{segmentID}/constraints` | List constraints |
| `POST /flags/{flagID}/segments/{segmentID}/constraints` | Add a constraint (`property`, `operator`, `value`) |
| `PUT /…/constraints/{constraintID}` | Update a constraint |
| `DELETE /…/constraints/{constraintID}` | Delete a constraint |

```bash
curl -X POST http://localhost:18000/api/v1/flags/42/segments/100/constraints \
  -H 'Content-Type: application/json' \
  -d '{"property": "country", "operator": "EQ", "value": "\"US\""}'
```

!> String values must be quoted *inside* the JSON string — `"value": "\"US\""`, not `"value": "US"`. An unquoted value is parsed as a variable and never matches. [Operator reference](flagr_operators).

## Distribution

A segment has **one** distribution; you replace it wholesale. The percentages must sum to **100**.

| Method & path | Purpose |
|---|---|
| `GET /flags/{flagID}/segments/{segmentID}/distributions` | Read the current distribution |
| `PUT /flags/{flagID}/segments/{segmentID}/distributions` | Replace it |

```bash
curl -X PUT http://localhost:18000/api/v1/flags/42/segments/100/distributions \
  -H 'Content-Type: application/json' \
  -d '{"distributions": [
        {"variantID": 200, "variantKey": "control",   "percent": 50},
        {"variantID": 201, "variantKey": "treatment", "percent": 50}
      ]}'
```

## Tags

| Method & path | Purpose |
|---|---|
| `GET /flags/{flagID}/tags` | List a flag's tags |
| `POST /flags/{flagID}/tags` | Add a tag (`value`) |
| `DELETE /flags/{flagID}/tags/{tagID}` | Remove a tag |
| `GET /tags` | List all tags across flags |

Tags drive [tag-based batch evaluation](flagr_eval_api) and search.

## History & change detection

| Method & path | Purpose |
|---|---|
| `GET /flags/{flagID}/snapshots` | The flag's revision history (every config change, who/when) — the data behind the UI History tab |
| `GET /flags/snapshots/max_id` | A single monotonically-increasing counter across *all* flag config. Poll it to cheaply detect "did anything change?" without diffing |

`max_id` is the lightweight alternative to the eval-API `ETag`: if the number hasn't moved, no flag configuration has changed.

## Export

| Method & path | Purpose |
|---|---|
| `GET /export/sqlite` | Download the entire flag database as a SQLite file |
| `GET /export/eval_cache/json` | Export the in-memory eval cache as JSON |

`export/eval_cache/json` accepts filters — `ids`, `keys`, `enabled`, `tags`, or `all` — and produces exactly the [JSON flag source](flagr_json_flag_spec) format. The common pattern is **export from a management instance → serve it to read-only eval nodes** via the `json_file` / `json_http` driver:

```bash
curl 'http://localhost:18000/api/v1/export/eval_cache/json?enabled=true' > flags.json
```

## A full flag, end to end

```bash
BASE=http://localhost:18000/api/v1
# 1. create the flag
FID=$(curl -s -X POST $BASE/flags -d '{"key":"checkout-redesign","description":"New checkout"}' | jq .id)
# 2. variants
curl -s -X POST $BASE/flags/$FID/variants -d '{"key":"control"}'
curl -s -X POST $BASE/flags/$FID/variants -d '{"key":"treatment"}'
# 3. a segment at 100% rollout
SID=$(curl -s -X POST $BASE/flags/$FID/segments -d '{"description":"all","rolloutPercent":100}' | jq .id)
# 4. a 50/50 distribution (use the variant IDs returned above)
curl -s -X PUT $BASE/flags/$FID/segments/$SID/distributions -d '{"distributions":[...]}'
# 5. turn it on
curl -s -X PUT $BASE/flags/$FID/enabled -d '{"enabled":true}'
```

After any write, allow one [eval-cache refresh](flagr_env) (~3s) before evaluations reflect the change.
