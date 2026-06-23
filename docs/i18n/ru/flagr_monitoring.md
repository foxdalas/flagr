# Мониторинг и метрики

Flagr отдаёт операционную телеметрию через Prometheus, StatsD/Datadog, трекинг ошибок (Sentry) и APM (New Relic). На этой странице описано, как включить каждый из них и что вы получаете. Для агрегированной аналитики *уровня флагов* (количество оценок по вариантам/сегментам) см. [Аналитику](flagr_datar).

У всех настроек есть строки со справкой по env-переменным в [Конфигурации сервера](flagr_env); эта страница — практическое руководство.

## Health-check

`GET /api/v1/health` возвращает `200` с `{"status": "OK"}`, как только сервер поднялся. Используйте его для liveness/readiness-проб балансировщика нагрузки и Kubernetes.

## Prometheus

Включите эндпоинт для сбора метрик:

```bash
export FLAGR_PROMETHEUS_ENABLED=true
export FLAGR_PROMETHEUS_PATH=/metrics                       # default
export FLAGR_PROMETHEUS_INCLUDE_LATENCY_HISTOGRAM=true      # optional latency histogram
```

После этого Flagr отдаёт метрики по адресу `FLAGR_PROMETHEUS_PATH` (по умолчанию `/metrics`).

### Метрики

| Метрика | Тип | Метки | Описание |
|--------|------|--------|-------------|
| `flagr_eval_results` | counter | `EntityType`, `FlagID`, `FlagKey`, `VariantID`, `VariantKey` | Инкремент на каждый результат оценки — ваш основной сигнал «кто какой вариант получил». |
| `flagr_requests_total` | counter | `status`, `path`, `method` | Всего HTTP-запросов. |
| `flagr_requests_buckets` | histogram | `status`, `path`, `method` | Гистограмма задержки запросов. Регистрируется только при `FLAGR_PROMETHEUS_INCLUDE_LATENCY_HISTOGRAM=true`. |
| `flagr_recorder_enqueued_total` | counter | — | Результаты оценки, поставленные в очередь на запись. Только когда активен [Kafka-recorder](flagr_env). |
| `flagr_recorder_dropped_total` | counter | — | Результаты оценки, отброшенные из-за переполнения буфера (backpressure recorder'а). Только для Kafka-recorder. |
| `flagr_recorder_errors_total` | counter | — | Сбои записи в recorder'е (например, брокер отклонил сообщение). Только для Kafka-recorder. |
| `flagr_recorder_worker_latency_seconds` | histogram | — | Время, за которое воркер записывает один результат (бакеты 0.001–5s). Только для Kafka-recorder. |
| `flagr_recorder_buffer_usage` | gauge | — | Текущая заполненность асинхронного буфера recorder'а — сравнивайте с `FLAGR_RECORDER_KAFKA_BUFFER_SIZE`, чтобы заметить насыщение. Только для Kafka-recorder. |

!> `flagr_eval_results` размечена метками `FlagID`, `FlagKey`, `VariantID` и `VariantKey`. Кардинальность растёт как флаги × варианты — это нормально для сотен флагов, но при очень больших масштабах за ней стоит присматривать. Она **не** размечается по сегменту или сущности (для разбивки по сегментам используйте [Аналитику](flagr_datar)).

### Конфигурация сбора метрик

```yaml
scrape_configs:
  - job_name: flagr
    metrics_path: /metrics
    static_configs:
      - targets: ["flagr:18000"]
```

### Примеры запросов

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

Отправляемые метрики (с применённым префиксом, например `flagr.http.requests.count`):

| Метрика | Тип | Описание |
|--------|------|-------------|
| `http.requests.count` | counter | HTTP-запросы, с тегами по status/path/method. |
| `http.requests.duration` | timer | Задержка запросов. |
| `evaluation` | counter | По одному на каждый результат оценки, с тегами `FlagID`, `VariantID`, `VariantKey`. |
| `flag.snapshot.updated` | counter | По одному на каждое изменение конфигурации флага (снимки журнала аудита), с тегами `FlagID`, `UpdatedBy`. |
| `data_recorder.kafka` | counter | По одному на каждый результат, записанный Kafka-recorder'ом, с тегом `FlagID`. |
| `notification.sent` | counter | Доставки вебхуков, с тегами `provider`, `operation`, `status` (`success`/`failure`). См. [Уведомления](flagr_notifications). |

### APM-трассировка Datadog

Агент Datadog также принимает APM-трейсы. Включите трассировку вместе со StatsD:

```bash
export FLAGR_STATSD_APM_ENABLED=true
export FLAGR_STATSD_APM_PORT=8126            # default
export FLAGR_STATSD_APM_SERVICE_NAME=flagr   # default
```

## Sentry (трекинг ошибок)

```bash
export FLAGR_SENTRY_ENABLED=true
export FLAGR_SENTRY_DSN=https://<key>@sentry.io/<project>
export FLAGR_SENTRY_ENVIRONMENT=production    # optional
```

Паники и ошибки на стороне сервера отправляются в ваш проект Sentry.

## New Relic (APM)

```bash
export FLAGR_NEWRELIC_ENABLED=true
export FLAGR_NEWRELIC_NAME=flagr              # app name in New Relic
export FLAGR_NEWRELIC_KEY=<license-key>
export FLAGR_NEWRELIC_DISTRIBUTED_TRACING_ENABLED=true   # optional
```

## Профилирование (pprof)

Профилировщик Go `pprof` **включён по умолчанию** (`FLAGR_PPROF_ENABLED=true`) и доступен по пути `/debug/pprof/`. Используйте его, чтобы снять профили CPU/heap/горутин с работающего экземпляра:

```bash
# 30-секундный профиль CPU
go tool pprof http://localhost:18000/debug/pprof/profile?seconds=30

# снимок кучи
go tool pprof http://localhost:18000/debug/pprof/heap
```

!> `pprof` раскрывает внутренности рантайма — не оставляйте `/debug/pprof/` доступным из публичного интернета. На экземплярах, обращённых в продакшен, установите `FLAGR_PPROF_ENABLED=false` или ограничьте доступ к этому пути на своём прокси.

## На что настраивать алерты

Несколько практичных отправных точек:

- **Доступность** — `GET /api/v1/health` падает или растёт `flagr_requests_total{status=~"5.."}`.
- **Задержка оценки** — p99 по `flagr_requests_buckets` для пути оценки.
- **Backpressure recorder'а** — рост `flagr_recorder_dropped_total` означает, что конвейер метрик не справляется.
- **Сбои вебхуков** — рост `notification.sent{status="failure"}`.
