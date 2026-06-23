# Monitoring & Metrics

Flagr exposes operational telemetry through Prometheus, StatsD/Datadog, error tracking (Sentry), and APM (New Relic). This page covers how to turn each on and what you get. For *flag-level* aggregate analytics (evaluation counts by variant/segment), see [Analytics](flagr_datar) instead.

All settings have env-var reference rows in [Server Config](flagr_env); this page is the how-to.

## Health check

`GET /api/v1/health` returns `200` with `{"status": "OK"}` once the server is up. Use it for load-balancer and Kubernetes liveness/readiness probes.

## Prometheus

Enable the scrape endpoint:

```bash
export FLAGR_PROMETHEUS_ENABLED=true
export FLAGR_PROMETHEUS_PATH=/metrics                       # default
export FLAGR_PROMETHEUS_INCLUDE_LATENCY_HISTOGRAM=true      # optional latency histogram
```

Flagr then serves metrics at `FLAGR_PROMETHEUS_PATH` (default `/metrics`).

### Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `flagr_eval_results` | counter | `EntityType`, `FlagID`, `FlagKey`, `VariantID`, `VariantKey` | One increment per evaluation result — your primary "who got which variant" signal. |
| `flagr_requests_total` | counter | `status`, `path`, `method` | Total HTTP requests. |
| `flagr_requests_buckets` | histogram | `status`, `path`, `method` | Request latency histogram. Only registered when `FLAGR_PROMETHEUS_INCLUDE_LATENCY_HISTOGRAM=true`. |
| `flagr_recorder_enqueued_total` | counter | — | Eval results enqueued for recording. Only when the [Kafka recorder](flagr_env) is active. |
| `flagr_recorder_dropped_total` | counter | — | Eval results dropped because the buffer was full (recorder backpressure). Kafka recorder only. |
| `flagr_recorder_errors_total` | counter | — | Recorder write failures (e.g. the broker rejected a message). Kafka recorder only. |
| `flagr_recorder_worker_latency_seconds` | histogram | — | Time a worker takes to record one result (buckets 0.001–5s). Kafka recorder only. |
| `flagr_recorder_buffer_usage` | gauge | — | Current depth of the async recorder buffer — compare against `FLAGR_RECORDER_KAFKA_BUFFER_SIZE` to spot saturation. Kafka recorder only. |

!> `flagr_eval_results` is labeled by `FlagID`, `FlagKey`, `VariantID`, and `VariantKey`. Cardinality scales with flags × variants — fine for hundreds of flags, but keep an eye on it at very large scale. It does **not** label by segment or entity (use [Analytics](flagr_datar) for segment breakdowns).

### Scrape config

```yaml
scrape_configs:
  - job_name: flagr
    metrics_path: /metrics
    static_configs:
      - targets: ["flagr:18000"]
```

### Example queries

```promql
# Evaluations per second, by variant, for one flag
sum by (VariantKey) (rate(flagr_eval_results{FlagKey="checkout-redesign"}[5m]))

# Request error rate
sum(rate(flagr_requests_total{status=~"5.."}[5m])) / sum(rate(flagr_requests_total[5m]))
```

## StatsD / Datadog

```bash
export FLAGR_STATSD_ENABLED=true
export FLAGR_STATSD_HOST=127.0.0.1     # default
export FLAGR_STATSD_PORT=8125          # default
export FLAGR_STATSD_PREFIX=flagr.      # default; prepended to every metric
```

Emitted metrics (with the prefix applied, e.g. `flagr.http.requests.count`):

| Metric | Type | Description |
|--------|------|-------------|
| `http.requests.count` | counter | HTTP requests, tagged by status/path/method. |
| `http.requests.duration` | timer | Request latency. |
| `evaluation` | counter | One per evaluation result, tagged `FlagID`, `VariantID`, `VariantKey`. |
| `flag.snapshot.updated` | counter | One per flag-config change (the audit-log snapshots), tagged `FlagID`, `UpdatedBy`. |
| `data_recorder.kafka` | counter | One per result written by the Kafka recorder, tagged `FlagID`. |
| `notification.sent` | counter | Webhook deliveries, tagged `provider`, `operation`, `status` (`success`/`failure`). See [Notifications](flagr_notifications). |

### Datadog APM tracing

Datadog's agent also accepts APM traces. Turn on tracing alongside StatsD:

```bash
export FLAGR_STATSD_APM_ENABLED=true
export FLAGR_STATSD_APM_PORT=8126            # default
export FLAGR_STATSD_APM_SERVICE_NAME=flagr   # default
```

## Sentry (error tracking)

```bash
export FLAGR_SENTRY_ENABLED=true
export FLAGR_SENTRY_DSN=https://<key>@sentry.io/<project>
export FLAGR_SENTRY_ENVIRONMENT=production    # optional
```

Panics and server-side errors are reported to your Sentry project.

## New Relic (APM)

```bash
export FLAGR_NEWRELIC_ENABLED=true
export FLAGR_NEWRELIC_NAME=flagr              # app name in New Relic
export FLAGR_NEWRELIC_KEY=<license-key>
export FLAGR_NEWRELIC_DISTRIBUTED_TRACING_ENABLED=true   # optional
```

## Profiling (pprof)

Go's `pprof` profiler is **enabled by default** (`FLAGR_PPROF_ENABLED=true`) and served under `/debug/pprof/`. Use it to capture CPU/heap/goroutine profiles from a live instance:

```bash
# 30-second CPU profile
go tool pprof http://localhost:18000/debug/pprof/profile?seconds=30

# heap snapshot
go tool pprof http://localhost:18000/debug/pprof/heap
```

!> `pprof` exposes runtime internals — don't leave `/debug/pprof/` reachable from the public internet. Set `FLAGR_PPROF_ENABLED=false`, or restrict the path at your proxy, on production-facing instances.

## What to alert on

A few practical starting points:

- **Availability** — `GET /api/v1/health` failing, or `flagr_requests_total{status=~"5.."}` rising.
- **Evaluation latency** — p99 of `flagr_requests_buckets` for the evaluation path.
- **Recorder backpressure** — `flagr_recorder_dropped_total` increasing means the metrics pipeline can't keep up.
- **Webhook failures** — `notification.sent{status="failure"}` climbing.
