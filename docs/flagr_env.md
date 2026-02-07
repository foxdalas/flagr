# Server Config

Configuration of Flagr server is derived from the environment variables. Latest [env.go](https://github.com/foxdalas/flagr/blob/master/pkg/config/env.go).

[env.go](https://raw.githubusercontent.com/foxdalas/flagr/master/pkg/config/env.go ':include :type=code')

For example

```go
// setting env variable
export FLAGR_DB_DBDRIVER=mysql

// results in
Config.DBDriver = "mysql"
```

## Kinesis Authentication

In order to use Flagr with Kinesis, you need to authenticate with AWS.
For that, you can use the standard AWS authentication methods:

### Environment

The most common way of authentication is over the environemnt, providing the `ACCESS_KEY_ID` and the `SECRET_ACCESS_KEY`. That way flagr can authenticate with AWS to connect to your Kinesis Stream.

e.g.:
```
AWS_ACCESS_KEY_ID=example123
AWS_SECRET_ACCESS_KEY=example123
AWS_DEFAULT_REGION=eu-central-1
```

More info: https://docs.aws.amazon.com/cli/latest/userguide/cli-environment.html

### Other Alternatives

Alternatively, there are couple more options to provide authentication to your stream, such as credentials file, container credentials or instance profiles. Read more about that on the [official AWS documentation](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html#config-settings-and-precedence).

**Important**: Make sure the key is attached to a user that has permissions to push records into the stream.

## Pubsub Authentication

You need to authenticate to enable Flagr with Google Cloud Pubsub for data records.
Here's a few ways:

### Gcloud (for development).

```sh
gcloud auth application-default login
```

### Environment

Create and download a service account JSON key and point to it using:

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service/account.json
```

> FYI: setting this env var will take over all Google's services on that environment.

The best way to configure service account for Flagr to use pubsub only use:

```
FLAGR_RECORDER_PUBSUB_PROJECT_ID=google-project-id
FLAGR_RECORDER_PUBSUB_KEYFILE=/path/to/service/account.json
```

Basic Authentication for web interface

```
FLAGR_BASIC_AUTH_ENABLED=true
FLAGR_BASIC_AUTH_USERNAME=admin
FLAGR_BASIC_AUTH_PASSWORD=password
```

By default, UI access will prompt for a username/password login. Similar to JWT Auth, prefix and exact paths can be whitelisted to skip the username/password login. The default whitelist will allow api access to `/api/v1/flags` and `/api/v1/evaluation*`

NOTE: this doesn't prevent people from directly curling /api/v1/flags to update flags.

```
FLAGR_BASIC_AUTH_WHITELIST_PATHS="/api/v1/health,/api/v1/flags,/api/v1/evaluation"
FLAGR_BASIC_AUTH_EXACT_WHITELIST_PATHS=""
```

---

## API Features Reference

### Batch Evaluation

Flagr supports evaluating multiple entities against multiple flags in a single request.

**POST** `/api/v1/evaluation/batch`

Evaluate a list of entities against a set of flags identified by IDs, keys, or tags.

```bash
curl -X POST http://localhost:18000/api/v1/evaluation/batch \
  -H "Content-Type: application/json" \
  -d '{
    "entities": [
      {"entityID": "user-123", "entityType": "user", "entityContext": {"country": "US"}},
      {"entityID": "user-456", "entityType": "user", "entityContext": {"country": "DE"}}
    ],
    "flagKeys": ["header-color", "checkout-flow"],
    "flagTags": ["experiment"],
    "flagTagsOperator": "ANY"
  }'
```

**GET** `/api/v1/evaluation/batch`

A lightweight GET variant with query parameters — useful as a drop-in replacement for lambda-style handlers.

| Parameter | Type | Description |
|-----------|------|-------------|
| `entityId` | string | Entity ID for evaluation |
| `flagId` | integer[] | Flag IDs to evaluate (multi) |
| `flagKey` | string[] | Flag keys to evaluate (multi) |
| `flagTag` | string[] | Flag tags to filter by (multi) |
| `flagTagQuery` | enum: ANY, ALL | How to combine tags (default: ALL) |

**DoS Protection:** Set `FLAGR_EVAL_BATCH_SIZE` to limit the total number of evaluations per batch request. The count is calculated as `len(entities) × (len(flagIDs) + len(flagKeys) + estimated_flags_from_tags)`. Default: `0` (no limit).

### Health Check

**GET** `/api/v1/health`

Returns `{"status": "OK"}` when the service is running. This endpoint is always whitelisted in both JWT and Basic Auth configurations by default, so it can be used by load balancers and orchestration systems without authentication.

### Export Endpoints

**GET** `/api/v1/export/sqlite`

Exports the entire database as a SQLite file. Useful for backups, debugging, or seeding read-only evaluation nodes.

| Parameter | Type | Description |
|-----------|------|-------------|
| `exclude_snapshots` | boolean | Export without snapshot data (smaller file) |

**GET** `/api/v1/export/eval_cache/json`

Exports the current in-memory evaluation cache as JSON. Useful for debugging what flag configurations are currently active in the evaluator.

### Flag Snapshots

**GET** `/api/v1/flags/{flagID}/snapshots`

Returns an audit trail of historical flag configurations. Each snapshot captures the complete flag state at a point in time.

| Parameter | Type | Description |
|-----------|------|-------------|
| `flagID` | integer (path) | Flag ID (required) |
| `limit` | integer | Number of snapshots to return |
| `offset` | integer | Pagination offset |
| `sort` | enum: ASC, DESC | Sort order by timestamp |

### Tag-Based Evaluation

Both single (`POST /api/v1/evaluation`) and batch evaluation support tag-based flag lookup via the `flagTags` and `flagTagsOperator` fields in the evaluation context.

- `flagTags` — an array of tag strings to match against flag tags
- `flagTagsOperator` — controls how multiple tags are combined:
  - `ANY` (default for single eval): evaluate flags containing **at least one** of the provided tags
  - `ALL`: evaluate only flags containing **all** provided tags

This allows evaluating flags by category without knowing their specific IDs or keys.

### Flag Search and Filtering

**GET** `/api/v1/flags`

Supports rich query filtering:

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Number of flags to return |
| `offset` | integer | Pagination offset |
| `enabled` | boolean | Filter by enabled status |
| `description` | string | Exact match on description |
| `description_like` | string | Partial (LIKE) match on description |
| `key` | string | Filter by flag key |
| `tags` | string | Filter by tags (comma-separated) |
| `deleted` | boolean | Return deleted flags |
| `preload` | boolean | Include preloaded segments and variants |

---

## Environment Variables Reference

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `localhost` | Flagr server host |
| `PORT` | `18000` | Flagr server port |
| `FLAGR_WEB_PREFIX` | _(empty)_ | Base path prefix for web UI and API (e.g. `/flagr` → UI at `/flagr`, API at `/flagr/api/v1`) |
| `FLAGR_PPROF_ENABLED` | `true` | Enable Go pprof HTTP server for profiling |

### Database

Flagr supports sqlite3, mysql, and postgres for read-write mode. For read-only evaluation, `json_file` and `json_http` drivers are available.

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_DB_DBDRIVER` | `sqlite3` | Database driver: `sqlite3`, `mysql`, `postgres`, `json_file`, `json_http` |
| `FLAGR_DB_DBCONNECTIONSTR` | `flagr.sqlite` | Database connection string |
| `FLAGR_DB_DBCONNECTION_DEBUG` | `true` | Log database queries (warning: may log credentials) |
| `FLAGR_DB_DBCONNECTION_RETRY_ATTEMPTS` | `9` | Number of connection retry attempts on startup |
| `FLAGR_DB_DBCONNECTION_RETRY_DELAY` | `100ms` | Delay between connection retries |

**Connection string examples:**

```
sqlite3     → "flagr.sqlite" or ":memory:"
mysql       → "root:@tcp(127.0.0.1:18100)/flagr?parseTime=true"
postgres    → "postgres://user:password@host:5432/flagr?sslmode=disable"
json_file   → "/tmp/flags.json"          (sets EvalOnlyMode=true)
json_http   → "https://example.com/flags.json"  (sets EvalOnlyMode=true)
```

### CORS

Controls Cross-Origin Resource Sharing headers for the API.

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_CORS_ENABLED` | `true` | Enable CORS |
| `FLAGR_CORS_ALLOW_CREDENTIALS` | `true` | Allow credentials in CORS requests |
| `FLAGR_CORS_ALLOWED_HEADERS` | `Origin,Accept,Content-Type,X-Requested-With,Authorization,Time_Zone` | Allowed request headers |
| `FLAGR_CORS_ALLOWED_METHODS` | `GET,POST,PUT,DELETE,PATCH` | Allowed HTTP methods |
| `FLAGR_CORS_ALLOWED_ORIGINS` | `*` | Allowed origins |
| `FLAGR_CORS_EXPOSED_HEADERS` | `WWW-Authenticate` | Headers exposed to the browser |
| `FLAGR_CORS_MAX_AGE` | `600` | Preflight cache duration in seconds |

### JWT Authentication

JWT auth protects the management UI and API. Tokens can be provided via cookies or the `Authorization: Bearer` header. Both HS256/HS512 (shared secret) and RS256 (PEM key) signing methods are supported.

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_JWT_AUTH_ENABLED` | `false` | Enable JWT authentication |
| `FLAGR_JWT_AUTH_DEBUG` | `false` | Enable debug logging for JWT auth |
| `FLAGR_JWT_AUTH_WHITELIST_PATHS` | `/api/v1/health,/api/v1/evaluation,/static` | Prefix-matched paths that skip JWT auth |
| `FLAGR_JWT_AUTH_EXACT_WHITELIST_PATHS` | `,/` | Exact-matched paths that skip JWT auth |
| `FLAGR_JWT_AUTH_COOKIE_TOKEN_NAME` | `access_token` | Cookie name containing the JWT token |
| `FLAGR_JWT_AUTH_SECRET` | _(empty)_ | JWT secret (passphrase for HS256, PEM key for RS256) |
| `FLAGR_JWT_AUTH_NO_TOKEN_STATUS_CODE` | `307` | HTTP status when no token: `307` (redirect) or `401` |
| `FLAGR_JWT_AUTH_NO_TOKEN_REDIRECT_URL` | _(empty)_ | URL to redirect to when no token is found |
| `FLAGR_JWT_AUTH_USER_PROPERTY` | `flagr_user` | Request context key for the authenticated user |
| `FLAGR_JWT_AUTH_USER_CLAIM` | `sub` | JWT claim used as user identifier (e.g. `sub`, `email`) |
| `FLAGR_JWT_AUTH_SIGNING_METHOD` | `HS256` | Signing method: `HS256`, `HS512`, or `RS256` |

### Header Authentication

Identify users through HTTP headers (e.g. from a reverse proxy or SSO).

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_HEADER_AUTH_ENABLED` | `false` | Enable header-based authentication |
| `FLAGR_HEADER_AUTH_USER_FIELD` | `X-Email` | Header field containing the user identity |

### Cookie Authentication

Identify users through cookies (e.g. via Cloudflare Zero Trust JWT tokens).

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_COOKIE_AUTH_ENABLED` | `false` | Enable cookie-based authentication |
| `FLAGR_COOKIE_AUTH_USER_FIELD` | `CF_Authorization` | Cookie name containing the auth token |
| `FLAGR_COOKIE_AUTH_USER_FIELD_JWT_CLAIM` | `email` | JWT claim to extract from the cookie token |

### Monitoring: Sentry

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_SENTRY_ENABLED` | `false` | Enable Sentry error tracking |
| `FLAGR_SENTRY_DSN` | _(empty)_ | Sentry DSN |
| `FLAGR_SENTRY_ENVIRONMENT` | _(empty)_ | Sentry environment tag |

### Monitoring: New Relic

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_NEWRELIC_ENABLED` | `false` | Enable New Relic monitoring |
| `FLAGR_NEWRELIC_DISTRIBUTED_TRACING_ENABLED` | `false` | Enable distributed tracing |
| `FLAGR_NEWRELIC_NAME` | `flagr` | Application name in New Relic |
| `FLAGR_NEWRELIC_KEY` | _(empty)_ | New Relic license key |

### Monitoring: StatsD / Datadog

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_STATSD_ENABLED` | `false` | Enable StatsD metrics |
| `FLAGR_STATSD_HOST` | `127.0.0.1` | StatsD host |
| `FLAGR_STATSD_PORT` | `8125` | StatsD port |
| `FLAGR_STATSD_PREFIX` | `flagr.` | Metric name prefix |
| `FLAGR_STATSD_APM_ENABLED` | `false` | Enable Datadog APM tracing |
| `FLAGR_STATSD_APM_PORT` | `8126` | Datadog APM agent port |
| `FLAGR_STATSD_APM_SERVICE_NAME` | `flagr` | APM service name |

### Monitoring: Prometheus

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_PROMETHEUS_ENABLED` | `false` | Enable Prometheus metrics export |
| `FLAGR_PROMETHEUS_PATH` | `/metrics` | HTTP path for Prometheus scraping |
| `FLAGR_PROMETHEUS_INCLUDE_LATENCY_HISTOGRAM` | `false` | Export request latency histograms (high cardinality) |

### Evaluation and Caching

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_EVAL_DEBUG_ENABLED` | `true` | Global switch for evaluation debug info in API responses |
| `FLAGR_EVAL_LOGGING_ENABLED` | `true` | Enable logging of evaluation results |
| `FLAGR_EVALCACHE_REFRESHTIMEOUT` | `59s` | Timeout for refreshing evaluation cache from DB |
| `FLAGR_EVALCACHE_REFRESHINTERVAL` | `3s` | Interval between evaluation cache refreshes |
| `FLAGR_EVAL_ONLY_MODE` | `false` | Only expose evaluation endpoints (auto-set for json_file/json_http drivers) |
| `FLAGR_EVAL_BATCH_SIZE` | `0` | Max evaluations per batch request; 0 = unlimited |

### Logging and Middleware

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_LOGRUS_LEVEL` | `info` | Logrus log level |
| `FLAGR_LOGRUS_FORMAT` | `text` | Log format: `text` or `json` |
| `FLAGR_MIDDLEWARE_VERBOSE_LOGGER_ENABLED` | `true` | Enable verbose request logging for all endpoints |
| `FLAGR_MIDDLEWARE_VERBOSE_LOGGER_EXCLUDE_URLS` | _(empty)_ | URLs to exclude from verbose logging (comma-separated) |
| `FLAGR_MIDDLEWARE_GZIP_ENABLED` | `true` | Enable gzip compression middleware |
| `FLAGR_RATELIMITER_PERFLAG_PERSECOND_CONSOLE_LOGGING` | `100` | Rate limit for per-flag console log output per second |

### Data Recorder

Flagr can record evaluation results for analytics. Supported backends: `kafka`, `kinesis`, `pubsub`.

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_RECORDER_ENABLED` | `false` | Enable data recording |
| `FLAGR_RECORDER_TYPE` | `kafka` | Recorder backend: `kafka`, `kinesis`, or `pubsub` |
| `FLAGR_RECORDER_FRAME_OUTPUT_MODE` | `payload_string` | Output format: `payload_string` (respects encryption) or `payload_raw_json` |

#### Kafka Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_RECORDER_KAFKA_BROKERS` | `:9092` | Kafka broker addresses |
| `FLAGR_RECORDER_KAFKA_TOPIC` | `flagr-records` | Kafka topic for records |
| `FLAGR_RECORDER_KAFKA_VERSION` | `2.1.0` | Kafka protocol version |
| `FLAGR_RECORDER_KAFKA_COMPRESSION_CODEC` | `0` | Compression: 0=none, 1=gzip, 2=snappy, 3=lz4 |
| `FLAGR_RECORDER_KAFKA_CERTFILE` | _(empty)_ | TLS certificate file |
| `FLAGR_RECORDER_KAFKA_KEYFILE` | _(empty)_ | TLS key file |
| `FLAGR_RECORDER_KAFKA_CAFILE` | _(empty)_ | TLS CA file |
| `FLAGR_RECORDER_KAFKA_VERIFYSSL` | `false` | Verify SSL certificates |
| `FLAGR_RECORDER_KAFKA_SIMPLE_SSL` | `false` | Use simple SSL (without client cert) |
| `FLAGR_RECORDER_KAFKA_SASL_USERNAME` | _(empty)_ | SASL username |
| `FLAGR_RECORDER_KAFKA_SASL_PASSWORD` | _(empty)_ | SASL password |
| `FLAGR_RECORDER_KAFKA_VERBOSE` | `true` | Verbose Kafka logging |
| `FLAGR_RECORDER_KAFKA_PARTITION_KEY_ENABLED` | `true` | Use partition keys |
| `FLAGR_RECORDER_KAFKA_RETRYMAX` | `5` | Max send retries |
| `FLAGR_RECORDER_KAFKA_MAXOPENREQUESTS` | `5` | Max in-flight requests |
| `FLAGR_RECORDER_KAFKA_REQUIRED_ACKS` | `1` | Required acks: 0=none, 1=leader, -1=all |
| `FLAGR_RECORDER_KAFKA_IDEMPOTENT` | `false` | Enable idempotent producer |
| `FLAGR_RECORDER_KAFKA_FLUSHFREQUENCY` | `500ms` | Batch flush frequency |
| `FLAGR_RECORDER_KAFKA_ENCRYPTED` | `false` | Encrypt payloads |
| `FLAGR_RECORDER_KAFKA_ENCRYPTION_KEY` | _(empty)_ | Encryption key for payloads |

#### Kinesis Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_RECORDER_KINESIS_STREAM_NAME` | `flagr-records` | Kinesis stream name |
| `FLAGR_RECORDER_KINESIS_BACKLOG_COUNT` | `500` | Producer backlog count |
| `FLAGR_RECORDER_KINESIS_MAX_CONNECTIONS` | `24` | Max connections to Kinesis |
| `FLAGR_RECORDER_KINESIS_FLUSH_INTERVAL` | `5s` | Flush interval |
| `FLAGR_RECORDER_KINESIS_BATCH_COUNT` | `500` | Records per batch |
| `FLAGR_RECORDER_KINESIS_BATCH_SIZE` | `0` | Batch size in bytes (0 = no limit) |
| `FLAGR_RECORDER_KINESIS_AGGREGATE_BATCH_COUNT` | `4294967295` | Aggregate batch count |
| `FLAGR_RECORDER_KINESIS_AGGREGATE_BATCH_SIZE` | `51200` | Aggregate batch size in bytes |
| `FLAGR_RECORDER_KINESIS_VERBOSE` | `false` | Verbose Kinesis logging |

#### Pubsub Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `FLAGR_RECORDER_PUBSUB_PROJECT_ID` | _(empty)_ | Google Cloud project ID |
| `FLAGR_RECORDER_PUBSUB_TOPIC_NAME` | `flagr-records` | Pubsub topic name |
| `FLAGR_RECORDER_PUBSUB_KEYFILE` | _(empty)_ | Service account JSON key file path |
| `FLAGR_RECORDER_PUBSUB_VERBOSE` | `false` | Verbose Pubsub logging |
| `FLAGR_RECORDER_PUBSUB_VERBOSE_CANCEL_TIMEOUT` | `5s` | Cancel timeout for verbose logging |
