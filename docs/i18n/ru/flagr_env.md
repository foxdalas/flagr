# Конфигурация сервера

Конфигурация сервера Flagr задаётся через переменные окружения. Актуальная версия — [env.go](https://github.com/foxdalas/flagr/blob/master/pkg/config/env.go).

[env.go](https://raw.githubusercontent.com/foxdalas/flagr/master/pkg/config/env.go ':include :type=code')

Например

```go
// setting env variable
export FLAGR_DB_DBDRIVER=mysql

// results in
Config.DBDriver = "mysql"
```

## Аутентификация в Kinesis

Чтобы использовать Flagr вместе с Kinesis, нужно пройти аутентификацию в AWS.
Для этого подойдут стандартные способы аутентификации AWS:

### Через окружение

Самый распространённый способ — аутентификация через переменные окружения: достаточно задать `ACCESS_KEY_ID` и `SECRET_ACCESS_KEY`. Так Flagr сможет аутентифицироваться в AWS и подключиться к вашему потоку Kinesis.

например:
```
AWS_ACCESS_KEY_ID=example123
AWS_SECRET_ACCESS_KEY=example123
AWS_DEFAULT_REGION=eu-central-1
```

Подробнее: https://docs.aws.amazon.com/cli/latest/userguide/cli-environment.html

### Другие варианты

Аутентификацию к потоку можно настроить и иначе — например, через файл учётных данных, учётные данные контейнера или профили инстансов. Подробнее об этом — в [официальной документации AWS](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html#config-settings-and-precedence).

**Важно**: убедитесь, что ключ привязан к пользователю, у которого есть права на отправку записей в поток.

## Аутентификация в Pubsub

Чтобы Flagr мог писать записи данных в Google Cloud Pubsub, нужно пройти аутентификацию.
Вот несколько способов:

### Gcloud (для разработки).

```sh
gcloud auth application-default login
```

### Через окружение

Создайте и скачайте JSON-ключ сервисного аккаунта, а затем укажите путь к нему:

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service/account.json
```

> К сведению: эта переменная окружения повлияет на все сервисы Google в данном окружении.

Чтобы сервисный аккаунт использовался только для pubsub, лучше указать:

```
FLAGR_RECORDER_PUBSUB_PROJECT_ID=google-project-id
FLAGR_RECORDER_PUBSUB_KEYFILE=/path/to/service/account.json
```

Базовая аутентификация для веб-интерфейса

```
FLAGR_BASIC_AUTH_ENABLED=true
FLAGR_BASIC_AUTH_USERNAME=admin
FLAGR_BASIC_AUTH_PASSWORD=password
```

По умолчанию при доступе к UI запрашиваются логин и пароль. Как и в случае с JWT, отдельные префиксы и точные пути можно добавить в белый список, чтобы для них вход по логину и паролю не требовался. Белый список по умолчанию открывает доступ к API по путям `/api/v1/flags` и `/api/v1/evaluation*`

ВНИМАНИЕ: это не защищает от прямых запросов curl к /api/v1/flags для изменения флагов.

```
FLAGR_BASIC_AUTH_WHITELIST_PATHS="/api/v1/health,/api/v1/flags,/api/v1/evaluation"
FLAGR_BASIC_AUTH_EXACT_WHITELIST_PATHS=""
```

---

## Справочник по возможностям API

### Пакетная оценка

Flagr умеет за один запрос оценивать несколько сущностей по нескольким флагам.

**POST** `/api/v1/evaluation/batch`

Оценка списка сущностей по набору флагов, заданных через ID, ключи или теги.

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

Облегчённый вариант на GET-запросе с параметрами строки запроса — удобен как готовая замена обработчикам в стиле lambda.

| Параметр | Тип | Описание |
|-----------|------|-------------|
| `entityId` | string | ID сущности для оценки |
| `flagId` | integer[] | ID флагов для оценки (можно несколько) |
| `flagKey` | string[] | Ключи флагов для оценки (можно несколько) |
| `flagTag` | string[] | Теги флагов для фильтрации (можно несколько) |
| `flagTagQuery` | enum: ANY, ALL | Как объединять теги (по умолчанию: ALL) |

**Защита от DoS:** задайте `FLAGR_EVAL_BATCH_SIZE`, чтобы ограничить общее число оценок в одном пакетном запросе. Оно вычисляется как `len(entities) × (len(flagIDs) + len(flagKeys) + estimated_flags_from_tags)`. По умолчанию: `0` (без ограничения).

### Проверка работоспособности

**GET** `/api/v1/health`

Возвращает `{"status": "OK"}`, если сервис работает. Этот эндпоинт по умолчанию всегда в белом списке как для JWT, так и для Basic Auth, поэтому балансировщики нагрузки и системы оркестрации могут обращаться к нему без аутентификации.

### Эндпоинты экспорта

**GET** `/api/v1/export/sqlite`

Экспортирует всю базу данных в файл SQLite. Удобно для резервных копий, отладки или для наполнения узлов оценки, работающих только на чтение.

| Параметр | Тип | Описание |
|-----------|------|-------------|
| `exclude_snapshots` | boolean | Экспорт без данных снимков (файл меньшего размера) |

**GET** `/api/v1/export/eval_cache/json`

Экспортирует текущий кэш оценки из памяти в формате JSON. Удобно, чтобы при отладке посмотреть, какие конфигурации флагов сейчас активны в движке оценки.

### Снимки флагов

**GET** `/api/v1/flags/{flagID}/snapshots`

Возвращает историю изменений конфигураций флага. Каждый снимок фиксирует полное состояние флага на конкретный момент времени.

| Параметр | Тип | Описание |
|-----------|------|-------------|
| `flagID` | integer (path) | ID флага (обязательный) |
| `limit` | integer | Сколько снимков вернуть |
| `offset` | integer | Смещение для постраничной выдачи |
| `sort` | enum: ASC, DESC | Порядок сортировки по времени |

### Оценка по тегам

И одиночная (`POST /api/v1/evaluation`), и пакетная оценка поддерживают поиск флагов по тегам — через поля `flagTags` и `flagTagsOperator` в контексте оценки.

- `flagTags` — массив строк-тегов для сопоставления с тегами флагов
- `flagTagsOperator` — определяет, как объединяются несколько тегов:
  - `ANY` (по умолчанию для одиночной оценки): оценивать флаги, у которых есть **хотя бы один** из указанных тегов
  - `ALL`: оценивать только флаги, у которых есть **все** указанные теги

Это позволяет оценивать флаги по категории, не зная их конкретных ID или ключей.

### Поиск и фильтрация флагов

**GET** `/api/v1/flags`

Поддерживает гибкую фильтрацию запросов:

| Параметр | Тип | Описание |
|-----------|------|-------------|
| `limit` | integer | Сколько флагов вернуть |
| `offset` | integer | Смещение для постраничной выдачи |
| `enabled` | boolean | Фильтр по тому, включён ли флаг |
| `description` | string | Точное совпадение по описанию |
| `description_like` | string | Частичное совпадение (LIKE) по описанию |
| `key` | string | Фильтр по ключу флага |
| `tags` | string | Фильтр по тегам (через запятую) |
| `deleted` | boolean | Возвращать удалённые флаги |
| `preload` | boolean | Подгружать сегменты и варианты |

---

## Справочник по переменным окружения

### Сервер

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `HOST` | `localhost` | Хост сервера Flagr |
| `PORT` | `18000` | Порт сервера Flagr |
| `FLAGR_WEB_PREFIX` | _(пусто)_ | Базовый префикс пути для веб-UI и API (например, `/flagr` → UI по адресу `/flagr`, API по `/flagr/api/v1`) |
| `FLAGR_PPROF_ENABLED` | `true` | Включить HTTP-сервер Go pprof для профилирования |

### База данных

В режиме чтения и записи Flagr поддерживает sqlite3, mysql и postgres. Для оценки в режиме только чтения доступны драйверы `json_file` и `json_http`.

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_DB_DBDRIVER` | `sqlite3` | Драйвер базы данных: `sqlite3`, `mysql`, `postgres`, `json_file`, `json_http` |
| `FLAGR_DB_DBCONNECTIONSTR` | `flagr.sqlite` | Строка подключения к базе данных |
| `FLAGR_DB_DBCONNECTION_DEBUG` | `true` | Логировать запросы к базе (внимание: в логи могут попасть учётные данные) |
| `FLAGR_DB_DBCONNECTION_RETRY_ATTEMPTS` | `9` | Сколько раз повторять попытку подключения при запуске |
| `FLAGR_DB_DBCONNECTION_RETRY_DELAY` | `100ms` | Задержка между повторными попытками подключения |

**Примеры строк подключения:**

```
sqlite3     → "flagr.sqlite" or ":memory:"
mysql       → "root:@tcp(127.0.0.1:18100)/flagr?parseTime=true"
postgres    → "postgres://user:password@host:5432/flagr?sslmode=disable"
json_file   → "/tmp/flags.json"          (sets EvalOnlyMode=true)
json_http   → "https://example.com/flags.json"  (sets EvalOnlyMode=true)
```

### CORS

Управляет заголовками Cross-Origin Resource Sharing для API.

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_CORS_ENABLED` | `true` | Включить CORS |
| `FLAGR_CORS_ALLOW_CREDENTIALS` | `true` | Разрешить передачу учётных данных в CORS-запросах |
| `FLAGR_CORS_ALLOWED_HEADERS` | `Origin,Accept,Content-Type,X-Requested-With,Authorization,Time_Zone` | Разрешённые заголовки запроса |
| `FLAGR_CORS_ALLOWED_METHODS` | `GET,POST,PUT,DELETE,PATCH` | Разрешённые HTTP-методы |
| `FLAGR_CORS_ALLOWED_ORIGINS` | `*` | Разрешённые источники (origins) |
| `FLAGR_CORS_EXPOSED_HEADERS` | `WWW-Authenticate` | Заголовки, доступные браузеру |
| `FLAGR_CORS_MAX_AGE` | `600` | Время кэширования preflight-запроса в секундах |

### JWT-аутентификация

JWT-аутентификация защищает UI управления и API. Токен можно передавать через куки или заголовок `Authorization: Bearer`. Поддерживаются методы подписи HS256/HS512 (общий секрет) и RS256 (PEM-ключ).

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_JWT_AUTH_ENABLED` | `false` | Включить JWT-аутентификацию |
| `FLAGR_JWT_AUTH_DEBUG` | `false` | Включить отладочное логирование JWT-аутентификации |
| `FLAGR_JWT_AUTH_WHITELIST_PATHS` | `/api/v1/health,/api/v1/evaluation,/static` | Пути (сопоставление по префиксу), для которых JWT-аутентификация пропускается |
| `FLAGR_JWT_AUTH_EXACT_WHITELIST_PATHS` | `,/` | Пути (точное сопоставление), для которых JWT-аутентификация пропускается |
| `FLAGR_JWT_AUTH_COOKIE_TOKEN_NAME` | `access_token` | Имя куки с JWT-токеном |
| `FLAGR_JWT_AUTH_SECRET` | _(пусто)_ | JWT-секрет (парольная фраза для HS256, PEM-ключ для RS256) |
| `FLAGR_JWT_AUTH_NO_TOKEN_STATUS_CODE` | `307` | HTTP-статус при отсутствии токена: `307` (редирект) или `401` |
| `FLAGR_JWT_AUTH_NO_TOKEN_REDIRECT_URL` | _(пусто)_ | URL для редиректа, если токен не найден |
| `FLAGR_JWT_AUTH_USER_PROPERTY` | `flagr_user` | Ключ в контексте запроса, под которым хранится аутентифицированный пользователь |
| `FLAGR_JWT_AUTH_USER_CLAIM` | `sub` | JWT-claim, используемый как идентификатор пользователя (например, `sub`, `email`) |
| `FLAGR_JWT_AUTH_SIGNING_METHOD` | `HS256` | Метод подписи: `HS256`, `HS512` или `RS256` |

### Аутентификация по заголовкам

Идентификация пользователей по HTTP-заголовкам (например, от обратного прокси или SSO).

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_HEADER_AUTH_ENABLED` | `false` | Включить аутентификацию по заголовкам |
| `FLAGR_HEADER_AUTH_USER_FIELD` | `X-Email` | Заголовок, в котором передаётся идентификатор пользователя |

### Аутентификация по кукам

Идентификация пользователей по кукам (например, через JWT-токены Cloudflare Zero Trust).

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_COOKIE_AUTH_ENABLED` | `false` | Включить аутентификацию по кукам |
| `FLAGR_COOKIE_AUTH_USER_FIELD` | `CF_Authorization` | Имя куки с токеном аутентификации |
| `FLAGR_COOKIE_AUTH_USER_FIELD_JWT_CLAIM` | `email` | JWT-claim, извлекаемый из токена в куке |

### Мониторинг: Sentry

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_SENTRY_ENABLED` | `false` | Включить отслеживание ошибок через Sentry |
| `FLAGR_SENTRY_DSN` | _(пусто)_ | Sentry DSN |
| `FLAGR_SENTRY_ENVIRONMENT` | _(пусто)_ | Тег окружения для Sentry |

### Мониторинг: New Relic

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_NEWRELIC_ENABLED` | `false` | Включить мониторинг через New Relic |
| `FLAGR_NEWRELIC_DISTRIBUTED_TRACING_ENABLED` | `false` | Включить распределённую трассировку |
| `FLAGR_NEWRELIC_NAME` | `flagr` | Имя приложения в New Relic |
| `FLAGR_NEWRELIC_KEY` | _(пусто)_ | Лицензионный ключ New Relic |

### Мониторинг: StatsD / Datadog

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_STATSD_ENABLED` | `false` | Включить метрики StatsD |
| `FLAGR_STATSD_HOST` | `127.0.0.1` | Хост StatsD |
| `FLAGR_STATSD_PORT` | `8125` | Порт StatsD |
| `FLAGR_STATSD_PREFIX` | `flagr.` | Префикс имён метрик |
| `FLAGR_STATSD_APM_ENABLED` | `false` | Включить трассировку Datadog APM |
| `FLAGR_STATSD_APM_PORT` | `8126` | Порт агента Datadog APM |
| `FLAGR_STATSD_APM_SERVICE_NAME` | `flagr` | Имя сервиса в APM |

### Мониторинг: Prometheus

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_PROMETHEUS_ENABLED` | `false` | Включить экспорт метрик в Prometheus |
| `FLAGR_PROMETHEUS_PATH` | `/metrics` | HTTP-путь, с которого Prometheus собирает метрики |
| `FLAGR_PROMETHEUS_INCLUDE_LATENCY_HISTOGRAM` | `false` | Экспортировать гистограммы задержки запросов (высокая кардинальность) |

### Оценка и кэширование

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_EVAL_DEBUG_ENABLED` | `true` | Глобальный переключатель отладочной информации об оценке в ответах API |
| `FLAGR_EVAL_LOGGING_ENABLED` | `true` | Включить логирование результатов оценки |
| `FLAGR_EVALCACHE_REFRESHTIMEOUT` | `59s` | Таймаут обновления кэша оценки из БД |
| `FLAGR_EVALCACHE_REFRESHINTERVAL` | `3s` | Интервал между обновлениями кэша оценки |
| `FLAGR_EVAL_ONLY_MODE` | `false` | Отдавать только эндпоинты оценки (включается автоматически для драйверов json_file/json_http) |
| `FLAGR_EVAL_BATCH_SIZE` | `0` | Максимум оценок в одном пакетном запросе; 0 = без ограничения |
| `FLAGR_OFREP_ENABLED` | `true` | Отдавать эндпоинты [OpenFeature Remote Evaluation Protocol](flagr_ofrep) (`/ofrep/v1/...`) |

### Логирование и middleware

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_LOGRUS_LEVEL` | `info` | Уровень логирования Logrus |
| `FLAGR_LOGRUS_FORMAT` | `text` | Формат логов: `text` или `json` |
| `FLAGR_MIDDLEWARE_VERBOSE_LOGGER_ENABLED` | `true` | Включить подробное логирование запросов для всех эндпоинтов |
| `FLAGR_MIDDLEWARE_VERBOSE_LOGGER_EXCLUDE_URLS` | _(пусто)_ | URL, которые не попадают в подробные логи (через запятую) |
| `FLAGR_MIDDLEWARE_GZIP_ENABLED` | `true` | Включить middleware gzip-сжатия |
| `FLAGR_RATELIMITER_PERFLAG_PERSECOND_CONSOLE_LOGGING` | `100` | Ограничение на число строк лога в консоль по каждому флагу в секунду |

### Регистратор данных

Flagr может записывать результаты оценки для аналитики. Поддерживаемые бэкенды: `kafka`, `kinesis`, `pubsub` и встроенный агрегатор `datar`. `FLAGR_RECORDER_TYPE` — это **список через запятую**: Flagr дублирует каждый результат во все перечисленные бэкенды (например, `kafka,datar` стримит в Kafka *и* при этом питает встроенную [Аналитику](flagr_datar)). Схему записи см. в разделе [Аналитика и записи данных](flagr_datar).

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_RECORDER_ENABLED` | `false` | Включить запись данных |
| `FLAGR_RECORDER_TYPE` | `kafka` | Бэкенд(ы) регистратора через запятую: `kafka`, `kinesis`, `pubsub`, `datar` |
| `FLAGR_RECORDER_FRAME_OUTPUT_MODE` | `payload_string` | Формат вывода: `payload_string` (учитывает шифрование) или `payload_raw_json` |

#### Конфигурация Kafka

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_RECORDER_KAFKA_BROKERS` | `:9092` | Адреса брокеров Kafka |
| `FLAGR_RECORDER_KAFKA_TOPIC` | `flagr-records` | Топик Kafka для записей |
| `FLAGR_RECORDER_KAFKA_VERSION` | `2.1.0` | Версия протокола Kafka |
| `FLAGR_RECORDER_KAFKA_COMPRESSION_CODEC` | `0` | Сжатие: 0=none, 1=gzip, 2=snappy, 3=lz4 |
| `FLAGR_RECORDER_KAFKA_CERTFILE` | _(пусто)_ | Файл TLS-сертификата |
| `FLAGR_RECORDER_KAFKA_KEYFILE` | _(пусто)_ | Файл TLS-ключа |
| `FLAGR_RECORDER_KAFKA_CAFILE` | _(пусто)_ | Файл TLS CA |
| `FLAGR_RECORDER_KAFKA_VERIFYSSL` | `false` | Проверять SSL-сертификаты |
| `FLAGR_RECORDER_KAFKA_SIMPLE_SSL` | `false` | Использовать простой SSL (без клиентского сертификата) |
| `FLAGR_RECORDER_KAFKA_SASL_USERNAME` | _(пусто)_ | Имя пользователя SASL |
| `FLAGR_RECORDER_KAFKA_SASL_PASSWORD` | _(пусто)_ | Пароль SASL |
| `FLAGR_RECORDER_KAFKA_VERBOSE` | `true` | Подробное логирование Kafka |
| `FLAGR_RECORDER_KAFKA_PARTITION_KEY_ENABLED` | `true` | Использовать ключи партиций |
| `FLAGR_RECORDER_KAFKA_RETRYMAX` | `5` | Максимум повторных отправок |
| `FLAGR_RECORDER_KAFKA_MAXOPENREQUESTS` | `5` | Максимум одновременных запросов в обработке |
| `FLAGR_RECORDER_KAFKA_REQUIRED_ACKS` | `1` | Требуемые подтверждения: 0=none, 1=leader, -1=all |
| `FLAGR_RECORDER_KAFKA_IDEMPOTENT` | `false` | Включить идемпотентный producer |
| `FLAGR_RECORDER_KAFKA_FLUSHFREQUENCY` | `500ms` | Частота сброса пакета |
| `FLAGR_RECORDER_KAFKA_BUFFER_SIZE` | `10000` | Размер буфера в памяти для результатов, ожидающих отправки. Когда буфер заполнен, результаты отбрасываются (см. `flagr_recorder_dropped_total`) — увеличьте его при всплесках трафика. |
| `FLAGR_RECORDER_KAFKA_WORKER_COUNT` | `4` | Число горутин-воркеров, разгружающих буфер в Kafka — основной рычаг пропускной способности. |
| `FLAGR_RECORDER_KAFKA_ENCRYPTED` | `false` | Шифровать полезную нагрузку (AES `simplebox`; только в режиме `payload_string` и только для Kafka) |
| `FLAGR_RECORDER_KAFKA_ENCRYPTION_KEY` | _(пусто)_ | Ключ шифрования полезной нагрузки |

#### Конфигурация Datar

Регистратор `datar` агрегирует результаты в памяти, чтобы питать встроенную [Аналитику](flagr_datar) (внешний брокер не нужен).

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_RECORDER_DATAR_FLUSH_INTERVAL` | `60s` | Как часто агрегированные счётчики сбрасываются в хранилище аналитики |

#### Конфигурация Kinesis

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_RECORDER_KINESIS_STREAM_NAME` | `flagr-records` | Имя потока Kinesis |
| `FLAGR_RECORDER_KINESIS_BACKLOG_COUNT` | `500` | Размер очереди producer'а |
| `FLAGR_RECORDER_KINESIS_MAX_CONNECTIONS` | `24` | Максимум подключений к Kinesis |
| `FLAGR_RECORDER_KINESIS_FLUSH_INTERVAL` | `5s` | Интервал сброса |
| `FLAGR_RECORDER_KINESIS_BATCH_COUNT` | `500` | Записей в одном пакете |
| `FLAGR_RECORDER_KINESIS_BATCH_SIZE` | `0` | Размер пакета в байтах (0 = без ограничения) |
| `FLAGR_RECORDER_KINESIS_AGGREGATE_BATCH_COUNT` | `4294967295` | Количество агрегированных пакетов |
| `FLAGR_RECORDER_KINESIS_AGGREGATE_BATCH_SIZE` | `51200` | Размер агрегированного пакета в байтах |
| `FLAGR_RECORDER_KINESIS_VERBOSE` | `false` | Подробное логирование Kinesis |

#### Конфигурация Pubsub

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_RECORDER_PUBSUB_PROJECT_ID` | _(пусто)_ | ID проекта Google Cloud |
| `FLAGR_RECORDER_PUBSUB_TOPIC_NAME` | `flagr-records` | Имя топика Pubsub |
| `FLAGR_RECORDER_PUBSUB_KEYFILE` | _(пусто)_ | Путь к JSON-ключу сервисного аккаунта |
| `FLAGR_RECORDER_PUBSUB_VERBOSE` | `false` | Подробное логирование Pubsub |
| `FLAGR_RECORDER_PUBSUB_VERBOSE_CANCEL_TIMEOUT` | `5s` | Таймаут отмены при подробном логировании |

### Уведомления

Уведомления через вебхуки при изменениях флагов. Формат тела запроса и триггеры см. в разделе [Уведомления](flagr_notifications).

| Переменная | По умолчанию | Описание |
|----------|---------|-------------|
| `FLAGR_NOTIFICATION_WEBHOOK_ENABLED` | `false` | Включить исходящие уведомления через вебхуки |
| `FLAGR_NOTIFICATION_WEBHOOK_URL` | _(пусто)_ | URL назначения для `POST`-вебхуков |
| `FLAGR_NOTIFICATION_WEBHOOK_HEADERS` | _(пусто)_ | Дополнительные HTTP-заголовки через запятую (например, `Authorization: Bearer x`) |
| `FLAGR_NOTIFICATION_TIMEOUT` | `10s` | Общий таймаут на одно уведомление, включая повторы |
| `FLAGR_NOTIFICATION_DETAILED_DIFF_ENABLED` | `false` | Встраивать `pre_value`/`post_value`/`diff` в тело запроса |
| `FLAGR_NOTIFICATION_MAX_RETRIES` | `3` | Число повторных попыток при временных сбоях; `0` отключает повторы |
| `FLAGR_NOTIFICATION_RETRY_BASE` | `1s` | Базовая задержка для экспоненциального бэкоффа между повторами |
| `FLAGR_NOTIFICATION_RETRY_MAX` | `10s` | Максимальная задержка между повторами |
