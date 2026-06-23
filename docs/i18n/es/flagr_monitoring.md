# Monitorización y métricas

Flagr expone telemetría operativa a través de Prometheus, StatsD/Datadog, seguimiento de errores (Sentry) y APM (New Relic). Esta página explica cómo activar cada uno y qué obtienes. Para la analítica agregada *a nivel de flag* (recuentos de evaluación por variante/segmento), consulta en su lugar [Analítica](flagr_datar).

Todos los ajustes tienen su fila de referencia de variable de entorno en [Configuración del servidor](flagr_env); esta página es la guía práctica.

## Comprobación de salud (health check)

`GET /api/v1/health` devuelve `200` con `{"status": "OK"}` una vez que el servidor está en marcha. Úsalo para las sondas de liveness/readiness del balanceador de carga y de Kubernetes.

## Prometheus

Habilita el endpoint de sondeo (scraping):

```bash
export FLAGR_PROMETHEUS_ENABLED=true
export FLAGR_PROMETHEUS_PATH=/metrics                       # default
export FLAGR_PROMETHEUS_INCLUDE_LATENCY_HISTOGRAM=true      # optional latency histogram
```

Flagr sirve entonces las métricas en `FLAGR_PROMETHEUS_PATH` (valor por defecto `/metrics`).

### Métricas

| Métrica | Tipo | Etiquetas | Descripción |
|--------|------|--------|-------------|
| `flagr_eval_results` | counter | `EntityType`, `FlagID`, `FlagKey`, `VariantID`, `VariantKey` | Un incremento por cada resultado de evaluación — tu señal principal de «quién recibió qué variante». |
| `flagr_requests_total` | counter | `status`, `path`, `method` | Total de peticiones HTTP. |
| `flagr_requests_buckets` | histogram | `status`, `path`, `method` | Histograma de latencia de las peticiones. Solo se registra cuando `FLAGR_PROMETHEUS_INCLUDE_LATENCY_HISTOGRAM=true`. |
| `flagr_recorder_enqueued_total` | counter | — | Resultados de evaluación encolados para su registro. Solo cuando el [recorder de Kafka](flagr_env) está activo. |
| `flagr_recorder_dropped_total` | counter | — | Resultados de evaluación descartados porque el búfer estaba lleno (backpressure del recorder). Solo con el recorder de Kafka. |
| `flagr_recorder_errors_total` | counter | — | Fallos de escritura del recorder (p. ej. el broker rechazó un mensaje). Solo con el recorder de Kafka. |
| `flagr_recorder_worker_latency_seconds` | histogram | — | Tiempo que tarda un worker en registrar un resultado (buckets de 0,001 a 5 s). Solo con el recorder de Kafka. |
| `flagr_recorder_buffer_usage` | gauge | — | Profundidad actual del búfer asíncrono del recorder — compárala con `FLAGR_RECORDER_KAFKA_BUFFER_SIZE` para detectar saturación. Solo con el recorder de Kafka. |

!> `flagr_eval_results` se etiqueta por `FlagID`, `FlagKey`, `VariantID` y `VariantKey`. La cardinalidad crece con flags × variantes — bien para cientos de flags, pero vigílala a escalas muy grandes. **No** se etiqueta por segmento ni por entidad (usa [Analítica](flagr_datar) para los desgloses por segmento).

### Configuración del sondeo (scrape)

```yaml
scrape_configs:
  - job_name: flagr
    metrics_path: /metrics
    static_configs:
      - targets: ["flagr:18000"]
```

### Consultas de ejemplo

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

Métricas emitidas (con el prefijo aplicado, p. ej. `flagr.http.requests.count`):

| Métrica | Tipo | Descripción |
|--------|------|-------------|
| `http.requests.count` | counter | Peticiones HTTP, etiquetadas por status/path/method. |
| `http.requests.duration` | timer | Latencia de las peticiones. |
| `evaluation` | counter | Una por cada resultado de evaluación, etiquetada con `FlagID`, `VariantID`, `VariantKey`. |
| `flag.snapshot.updated` | counter | Una por cada cambio en la configuración de un flag (los snapshots del registro de auditoría), etiquetada con `FlagID`, `UpdatedBy`. |
| `data_recorder.kafka` | counter | Una por cada resultado escrito por el recorder de Kafka, etiquetada con `FlagID`. |
| `notification.sent` | counter | Entregas de webhook, etiquetadas con `provider`, `operation`, `status` (`success`/`failure`). Consulta [Notificaciones](flagr_notifications). |

### Trazas APM de Datadog

El agente de Datadog también acepta trazas APM. Activa el trazado junto con StatsD:

```bash
export FLAGR_STATSD_APM_ENABLED=true
export FLAGR_STATSD_APM_PORT=8126            # default
export FLAGR_STATSD_APM_SERVICE_NAME=flagr   # default
```

## Sentry (seguimiento de errores)

```bash
export FLAGR_SENTRY_ENABLED=true
export FLAGR_SENTRY_DSN=https://<key>@sentry.io/<project>
export FLAGR_SENTRY_ENVIRONMENT=production    # optional
```

Los panics y los errores del lado del servidor se reportan a tu proyecto de Sentry.

## New Relic (APM)

```bash
export FLAGR_NEWRELIC_ENABLED=true
export FLAGR_NEWRELIC_NAME=flagr              # app name in New Relic
export FLAGR_NEWRELIC_KEY=<license-key>
export FLAGR_NEWRELIC_DISTRIBUTED_TRACING_ENABLED=true   # optional
```

## Perfilado (pprof)

El perfilador `pprof` de Go está **habilitado por defecto** (`FLAGR_PPROF_ENABLED=true`) y se sirve bajo `/debug/pprof/`. Úsalo para capturar perfiles de CPU/heap/goroutines de una instancia en vivo:

```bash
# 30-second CPU profile
go tool pprof http://localhost:18000/debug/pprof/profile?seconds=30

# heap snapshot
go tool pprof http://localhost:18000/debug/pprof/heap
```

!> `pprof` expone elementos internos del runtime — no dejes `/debug/pprof/` accesible desde la internet pública. Establece `FLAGR_PPROF_ENABLED=false`, o restringe la ruta en tu proxy, en las instancias expuestas en producción.

## Sobre qué alertar

Algunos puntos de partida prácticos:

- **Disponibilidad** — `GET /api/v1/health` fallando, o `flagr_requests_total{status=~"5.."}` al alza.
- **Latencia de evaluación** — el p99 de `flagr_requests_buckets` para la ruta de evaluación.
- **Backpressure del recorder** — un `flagr_recorder_dropped_total` creciente significa que el pipeline de métricas no da abasto.
- **Fallos de webhook** — `notification.sent{status="failure"}` en aumento.
