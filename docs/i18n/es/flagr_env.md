# Configuración del Servidor

La configuración del servidor Flagr se deriva de las variables de entorno. Consulta el [env.go](https://github.com/foxdalas/flagr/blob/master/pkg/config/env.go) más reciente.

[env.go](https://raw.githubusercontent.com/foxdalas/flagr/master/pkg/config/env.go ':include :type=code')

Por ejemplo

```go
// setting env variable
export FLAGR_DB_DBDRIVER=mysql

// results in
Config.DBDriver = "mysql"
```

## Autenticación de Kinesis

Para usar Flagr con Kinesis, necesitas autenticarte con AWS.
Para ello, puedes usar los métodos de autenticación estándar de AWS:

### Entorno

La forma más común de autenticación es a través del entorno, proporcionando el `ACCESS_KEY_ID` y la `SECRET_ACCESS_KEY`. De esa manera, flagr puede autenticarse con AWS para conectarse a tu stream de Kinesis.

p. ej.:
```
AWS_ACCESS_KEY_ID=example123
AWS_SECRET_ACCESS_KEY=example123
AWS_DEFAULT_REGION=eu-central-1
```

Más información: https://docs.aws.amazon.com/cli/latest/userguide/cli-environment.html

### Otras alternativas

Como alternativa, hay un par de opciones más para proporcionar autenticación a tu stream, como un archivo de credenciales, credenciales de contenedor o perfiles de instancia. Lee más sobre esto en la [documentación oficial de AWS](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html#config-settings-and-precedence).

**Importante**: Asegúrate de que la clave esté asociada a un usuario que tenga permisos para insertar registros en el stream.

## Autenticación de Pubsub

Necesitas autenticarte para habilitar Flagr con Google Cloud Pubsub para los registros de datos.
Aquí tienes algunas formas:

### Gcloud (para desarrollo).

```sh
gcloud auth application-default login
```

### Entorno

Crea y descarga una clave JSON de cuenta de servicio y apunta a ella usando:

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service/account.json
```

> Para tu información: establecer esta variable de entorno tomará el control de todos los servicios de Google en ese entorno.

La mejor manera de configurar la cuenta de servicio para que Flagr use únicamente pubsub es:

```
FLAGR_RECORDER_PUBSUB_PROJECT_ID=google-project-id
FLAGR_RECORDER_PUBSUB_KEYFILE=/path/to/service/account.json
```

Autenticación básica para la interfaz web

```
FLAGR_BASIC_AUTH_ENABLED=true
FLAGR_BASIC_AUTH_USERNAME=admin
FLAGR_BASIC_AUTH_PASSWORD=password
```

De forma predeterminada, el acceso a la interfaz de usuario solicitará un inicio de sesión con nombre de usuario/contraseña. De forma similar a la autenticación JWT, se pueden incluir en la lista blanca prefijos y rutas exactas para omitir el inicio de sesión con nombre de usuario/contraseña. La lista blanca predeterminada permitirá el acceso a la API en `/api/v1/flags` y `/api/v1/evaluation*`

NOTA: esto no impide que las personas accedan directamente con curl a /api/v1/flags para actualizar flags.

```
FLAGR_BASIC_AUTH_WHITELIST_PATHS="/api/v1/health,/api/v1/flags,/api/v1/evaluation"
FLAGR_BASIC_AUTH_EXACT_WHITELIST_PATHS=""
```

---

## Referencia de Funciones de la API

### Evaluación por Lotes

Flagr admite la evaluación de múltiples entidades contra múltiples flags en una sola petición.

**POST** `/api/v1/evaluation/batch`

Evalúa una lista de entidades contra un conjunto de flags identificados por IDs, claves o etiquetas.

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

Una variante GET ligera con parámetros de consulta, útil como reemplazo directo para handlers de tipo lambda.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `entityId` | string | ID de entidad para la evaluación |
| `flagId` | integer[] | IDs de flags a evaluar (múltiple) |
| `flagKey` | string[] | Claves de flags a evaluar (múltiple) |
| `flagTag` | string[] | Etiquetas de flags por las que filtrar (múltiple) |
| `flagTagQuery` | enum: ANY, ALL | Cómo combinar las etiquetas (predeterminado: ALL) |

**Protección contra DoS:** Establece `FLAGR_EVAL_BATCH_SIZE` para limitar el número total de evaluaciones por petición de lote. El recuento se calcula como `len(entities) × (len(flagIDs) + len(flagKeys) + estimated_flags_from_tags)`. Predeterminado: `0` (sin límite).

### Comprobación de Estado

**GET** `/api/v1/health`

Devuelve `{"status": "OK"}` cuando el servicio está en ejecución. Este endpoint siempre está en la lista blanca tanto en las configuraciones de autenticación JWT como en las de autenticación básica de forma predeterminada, por lo que puede ser utilizado por balanceadores de carga y sistemas de orquestación sin autenticación.

### Endpoints de Exportación

**GET** `/api/v1/export/sqlite`

Exporta toda la base de datos como un archivo SQLite. Útil para copias de seguridad, depuración o para sembrar nodos de evaluación de solo lectura.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `exclude_snapshots` | boolean | Exportar sin datos de snapshot (archivo más pequeño) |

**GET** `/api/v1/export/eval_cache/json`

Exporta la caché de evaluación actual en memoria como JSON. Útil para depurar qué configuraciones de flags están actualmente activas en el evaluador.

### Snapshots de Flags

**GET** `/api/v1/flags/{flagID}/snapshots`

Devuelve un registro de auditoría de configuraciones históricas de un flag. Cada snapshot captura el estado completo del flag en un momento determinado.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `flagID` | integer (path) | ID del flag (obligatorio) |
| `limit` | integer | Número de snapshots a devolver |
| `offset` | integer | Desplazamiento de paginación |
| `sort` | enum: ASC, DESC | Orden de clasificación por marca de tiempo |

### Evaluación Basada en Etiquetas

Tanto la evaluación individual (`POST /api/v1/evaluation`) como la evaluación por lotes admiten la búsqueda de flags basada en etiquetas mediante los campos `flagTags` y `flagTagsOperator` en el contexto de evaluación.

- `flagTags` — un array de cadenas de etiquetas para comparar con las etiquetas de los flags
- `flagTagsOperator` — controla cómo se combinan múltiples etiquetas:
  - `ANY` (predeterminado para la evaluación individual): evalúa los flags que contengan **al menos una** de las etiquetas proporcionadas
  - `ALL`: evalúa solo los flags que contengan **todas** las etiquetas proporcionadas

Esto permite evaluar flags por categoría sin conocer sus IDs o claves específicos.

### Búsqueda y Filtrado de Flags

**GET** `/api/v1/flags`

Admite un completo filtrado por consultas:

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `limit` | integer | Número de flags a devolver |
| `offset` | integer | Desplazamiento de paginación |
| `enabled` | boolean | Filtrar por estado habilitado |
| `description` | string | Coincidencia exacta en la descripción |
| `description_like` | string | Coincidencia parcial (LIKE) en la descripción |
| `key` | string | Filtrar por clave de flag |
| `tags` | string | Filtrar por etiquetas (separadas por comas) |
| `deleted` | boolean | Devolver flags eliminados |
| `preload` | boolean | Incluir los segmentos y las variantes precargados |

---

## Referencia de Variables de Entorno

### Servidor

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `HOST` | `localhost` | Host del servidor Flagr |
| `PORT` | `18000` | Puerto del servidor Flagr |
| `FLAGR_WEB_PREFIX` | _(vacío)_ | Prefijo de ruta base para la interfaz web y la API (p. ej. `/flagr` → interfaz en `/flagr`, API en `/flagr/api/v1`) |
| `FLAGR_PPROF_ENABLED` | `true` | Habilitar el servidor HTTP de Go pprof para perfilado |

### Base de Datos

Flagr admite sqlite3, mysql y postgres para el modo de lectura-escritura. Para la evaluación de solo lectura, están disponibles los drivers `json_file` y `json_http`.

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_DB_DBDRIVER` | `sqlite3` | Driver de base de datos: `sqlite3`, `mysql`, `postgres`, `json_file`, `json_http` |
| `FLAGR_DB_DBCONNECTIONSTR` | `flagr.sqlite` | Cadena de conexión a la base de datos |
| `FLAGR_DB_DBCONNECTION_DEBUG` | `true` | Registrar las consultas a la base de datos (advertencia: puede registrar credenciales) |
| `FLAGR_DB_DBCONNECTION_RETRY_ATTEMPTS` | `9` | Número de intentos de reconexión al iniciar |
| `FLAGR_DB_DBCONNECTION_RETRY_DELAY` | `100ms` | Retardo entre reintentos de conexión |

**Ejemplos de cadenas de conexión:**

```
sqlite3     → "flagr.sqlite" or ":memory:"
mysql       → "root:@tcp(127.0.0.1:18100)/flagr?parseTime=true"
postgres    → "postgres://user:password@host:5432/flagr?sslmode=disable"
json_file   → "/tmp/flags.json"          (sets EvalOnlyMode=true)
json_http   → "https://example.com/flags.json"  (sets EvalOnlyMode=true)
```

### CORS

Controla las cabeceras de Cross-Origin Resource Sharing para la API.

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_CORS_ENABLED` | `true` | Habilitar CORS |
| `FLAGR_CORS_ALLOW_CREDENTIALS` | `true` | Permitir credenciales en las peticiones CORS |
| `FLAGR_CORS_ALLOWED_HEADERS` | `Origin,Accept,Content-Type,X-Requested-With,Authorization,Time_Zone` | Cabeceras de petición permitidas |
| `FLAGR_CORS_ALLOWED_METHODS` | `GET,POST,PUT,DELETE,PATCH` | Métodos HTTP permitidos |
| `FLAGR_CORS_ALLOWED_ORIGINS` | `*` | Orígenes permitidos |
| `FLAGR_CORS_EXPOSED_HEADERS` | `WWW-Authenticate` | Cabeceras expuestas al navegador |
| `FLAGR_CORS_MAX_AGE` | `600` | Duración de la caché de preflight en segundos |

### Autenticación JWT

La autenticación JWT protege la interfaz de gestión y la API. Los tokens pueden proporcionarse mediante cookies o la cabecera `Authorization: Bearer`. Se admiten los métodos de firma HS256/HS512 (secreto compartido) y RS256 (clave PEM).

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_JWT_AUTH_ENABLED` | `false` | Habilitar la autenticación JWT |
| `FLAGR_JWT_AUTH_DEBUG` | `false` | Habilitar el registro de depuración para la autenticación JWT |
| `FLAGR_JWT_AUTH_WHITELIST_PATHS` | `/api/v1/health,/api/v1/evaluation,/static` | Rutas con coincidencia por prefijo que omiten la autenticación JWT |
| `FLAGR_JWT_AUTH_EXACT_WHITELIST_PATHS` | `,/` | Rutas con coincidencia exacta que omiten la autenticación JWT |
| `FLAGR_JWT_AUTH_COOKIE_TOKEN_NAME` | `access_token` | Nombre de la cookie que contiene el token JWT |
| `FLAGR_JWT_AUTH_SECRET` | _(vacío)_ | Secreto JWT (frase de contraseña para HS256, clave PEM para RS256) |
| `FLAGR_JWT_AUTH_NO_TOKEN_STATUS_CODE` | `307` | Estado HTTP cuando no hay token: `307` (redirección) o `401` |
| `FLAGR_JWT_AUTH_NO_TOKEN_REDIRECT_URL` | _(vacío)_ | URL a la que redirigir cuando no se encuentra ningún token |
| `FLAGR_JWT_AUTH_USER_PROPERTY` | `flagr_user` | Clave del contexto de la petición para el usuario autenticado |
| `FLAGR_JWT_AUTH_USER_CLAIM` | `sub` | Claim del JWT usado como identificador de usuario (p. ej. `sub`, `email`) |
| `FLAGR_JWT_AUTH_SIGNING_METHOD` | `HS256` | Método de firma: `HS256`, `HS512` o `RS256` |

### Autenticación por Cabecera

Identifica a los usuarios mediante cabeceras HTTP (p. ej. desde un proxy inverso o SSO).

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_HEADER_AUTH_ENABLED` | `false` | Habilitar la autenticación basada en cabeceras |
| `FLAGR_HEADER_AUTH_USER_FIELD` | `X-Email` | Campo de cabecera que contiene la identidad del usuario |

### Autenticación por Cookie

Identifica a los usuarios mediante cookies (p. ej. a través de tokens JWT de Cloudflare Zero Trust).

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_COOKIE_AUTH_ENABLED` | `false` | Habilitar la autenticación basada en cookies |
| `FLAGR_COOKIE_AUTH_USER_FIELD` | `CF_Authorization` | Nombre de la cookie que contiene el token de autenticación |
| `FLAGR_COOKIE_AUTH_USER_FIELD_JWT_CLAIM` | `email` | Claim del JWT a extraer del token de la cookie |

### Monitorización: Sentry

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_SENTRY_ENABLED` | `false` | Habilitar el seguimiento de errores con Sentry |
| `FLAGR_SENTRY_DSN` | _(vacío)_ | DSN de Sentry |
| `FLAGR_SENTRY_ENVIRONMENT` | _(vacío)_ | Etiqueta de entorno de Sentry |

### Monitorización: New Relic

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_NEWRELIC_ENABLED` | `false` | Habilitar la monitorización con New Relic |
| `FLAGR_NEWRELIC_DISTRIBUTED_TRACING_ENABLED` | `false` | Habilitar el trazado distribuido |
| `FLAGR_NEWRELIC_NAME` | `flagr` | Nombre de la aplicación en New Relic |
| `FLAGR_NEWRELIC_KEY` | _(vacío)_ | Clave de licencia de New Relic |

### Monitorización: StatsD / Datadog

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_STATSD_ENABLED` | `false` | Habilitar las métricas de StatsD |
| `FLAGR_STATSD_HOST` | `127.0.0.1` | Host de StatsD |
| `FLAGR_STATSD_PORT` | `8125` | Puerto de StatsD |
| `FLAGR_STATSD_PREFIX` | `flagr.` | Prefijo del nombre de las métricas |
| `FLAGR_STATSD_APM_ENABLED` | `false` | Habilitar el trazado APM de Datadog |
| `FLAGR_STATSD_APM_PORT` | `8126` | Puerto del agente APM de Datadog |
| `FLAGR_STATSD_APM_SERVICE_NAME` | `flagr` | Nombre del servicio APM |

### Monitorización: Prometheus

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_PROMETHEUS_ENABLED` | `false` | Habilitar la exportación de métricas de Prometheus |
| `FLAGR_PROMETHEUS_PATH` | `/metrics` | Ruta HTTP para el scraping de Prometheus |
| `FLAGR_PROMETHEUS_INCLUDE_LATENCY_HISTOGRAM` | `false` | Exportar histogramas de latencia de las peticiones (alta cardinalidad) |

### Evaluación y Caché

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_EVAL_DEBUG_ENABLED` | `true` | Interruptor global para la información de depuración de la evaluación en las respuestas de la API |
| `FLAGR_EVAL_LOGGING_ENABLED` | `true` | Habilitar el registro de los resultados de la evaluación |
| `FLAGR_EVALCACHE_REFRESHTIMEOUT` | `59s` | Tiempo de espera para refrescar la caché de evaluación desde la base de datos |
| `FLAGR_EVALCACHE_REFRESHINTERVAL` | `3s` | Intervalo entre refrescos de la caché de evaluación |
| `FLAGR_EVAL_ONLY_MODE` | `false` | Exponer únicamente los endpoints de evaluación (se establece automáticamente para los drivers json_file/json_http) |
| `FLAGR_EVAL_BATCH_SIZE` | `0` | Máximo de evaluaciones por petición de lote; 0 = ilimitado |
| `FLAGR_OFREP_ENABLED` | `true` | Exponer los endpoints del [Protocolo de Evaluación Remota de OpenFeature](flagr_ofrep) (`/ofrep/v1/...`) |

### Registro y Middleware

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_LOGRUS_LEVEL` | `info` | Nivel de registro de Logrus |
| `FLAGR_LOGRUS_FORMAT` | `text` | Formato de registro: `text` o `json` |
| `FLAGR_MIDDLEWARE_VERBOSE_LOGGER_ENABLED` | `true` | Habilitar el registro detallado de peticiones para todos los endpoints |
| `FLAGR_MIDDLEWARE_VERBOSE_LOGGER_EXCLUDE_URLS` | _(vacío)_ | URLs a excluir del registro detallado (separadas por comas) |
| `FLAGR_MIDDLEWARE_GZIP_ENABLED` | `true` | Habilitar el middleware de compresión gzip |
| `FLAGR_RATELIMITER_PERFLAG_PERSECOND_CONSOLE_LOGGING` | `100` | Límite de tasa para la salida de registro en consola por flag por segundo |

### Grabador de Datos

Flagr puede grabar los resultados de evaluación para análisis. Backends compatibles: `kafka`, `kinesis`, `pubsub` y el agregador en proceso `datar`. `FLAGR_RECORDER_TYPE` es una **lista separada por comas** — Flagr distribuye cada resultado a todos los backends listados (p. ej. `kafka,datar` envía a Kafka *y* alimenta la [Analítica](flagr_datar) integrada). Consulta [Analítica y registros de datos](flagr_datar) para conocer el esquema de los registros.

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_RECORDER_ENABLED` | `false` | Habilitar la grabación de datos |
| `FLAGR_RECORDER_TYPE` | `kafka` | Backend(s) del grabador, separados por comas: `kafka`, `kinesis`, `pubsub`, `datar` |
| `FLAGR_RECORDER_FRAME_OUTPUT_MODE` | `payload_string` | Formato de salida: `payload_string` (respeta el cifrado) o `payload_raw_json` |

#### Configuración de Kafka

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_RECORDER_KAFKA_BROKERS` | `:9092` | Direcciones de los brokers de Kafka |
| `FLAGR_RECORDER_KAFKA_TOPIC` | `flagr-records` | Topic de Kafka para los registros |
| `FLAGR_RECORDER_KAFKA_VERSION` | `2.1.0` | Versión del protocolo de Kafka |
| `FLAGR_RECORDER_KAFKA_COMPRESSION_CODEC` | `0` | Compresión: 0=ninguna, 1=gzip, 2=snappy, 3=lz4 |
| `FLAGR_RECORDER_KAFKA_CERTFILE` | _(vacío)_ | Archivo de certificado TLS |
| `FLAGR_RECORDER_KAFKA_KEYFILE` | _(vacío)_ | Archivo de clave TLS |
| `FLAGR_RECORDER_KAFKA_CAFILE` | _(vacío)_ | Archivo de CA TLS |
| `FLAGR_RECORDER_KAFKA_VERIFYSSL` | `false` | Verificar los certificados SSL |
| `FLAGR_RECORDER_KAFKA_SIMPLE_SSL` | `false` | Usar SSL simple (sin certificado de cliente) |
| `FLAGR_RECORDER_KAFKA_SASL_USERNAME` | _(vacío)_ | Nombre de usuario SASL |
| `FLAGR_RECORDER_KAFKA_SASL_PASSWORD` | _(vacío)_ | Contraseña SASL |
| `FLAGR_RECORDER_KAFKA_VERBOSE` | `true` | Registro detallado de Kafka |
| `FLAGR_RECORDER_KAFKA_PARTITION_KEY_ENABLED` | `true` | Usar claves de partición |
| `FLAGR_RECORDER_KAFKA_RETRYMAX` | `5` | Máximo de reintentos de envío |
| `FLAGR_RECORDER_KAFKA_MAXOPENREQUESTS` | `5` | Máximo de peticiones en curso |
| `FLAGR_RECORDER_KAFKA_REQUIRED_ACKS` | `1` | Acks requeridos: 0=ninguno, 1=líder, -1=todos |
| `FLAGR_RECORDER_KAFKA_IDEMPOTENT` | `false` | Habilitar el productor idempotente |
| `FLAGR_RECORDER_KAFKA_FLUSHFREQUENCY` | `500ms` | Frecuencia de vaciado de lotes |
| `FLAGR_RECORDER_KAFKA_BUFFER_SIZE` | `10000` | Tamaño del búfer en memoria de los resultados a la espera de envío. Cuando está lleno, los resultados se descartan (consulta `flagr_recorder_dropped_total`) — auméntalo para tráfico con picos. |
| `FLAGR_RECORDER_KAFKA_WORKER_COUNT` | `4` | Número de goroutines de trabajo que vacían el búfer hacia Kafka — la principal palanca de rendimiento. |
| `FLAGR_RECORDER_KAFKA_ENCRYPTED` | `false` | Cifrar los payloads (AES `simplebox`; solo en modo `payload_string`, solo Kafka) |
| `FLAGR_RECORDER_KAFKA_ENCRYPTION_KEY` | _(vacío)_ | Clave de cifrado para los payloads |

#### Configuración de Datar

El grabador `datar` agrega los resultados en memoria para alimentar la [Analítica](flagr_datar) integrada (no requiere ningún broker externo).

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_RECORDER_DATAR_FLUSH_INTERVAL` | `60s` | Con qué frecuencia se vacían los contadores agregados al almacén de analítica |

#### Configuración de Kinesis

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_RECORDER_KINESIS_STREAM_NAME` | `flagr-records` | Nombre del stream de Kinesis |
| `FLAGR_RECORDER_KINESIS_BACKLOG_COUNT` | `500` | Recuento del backlog del productor |
| `FLAGR_RECORDER_KINESIS_MAX_CONNECTIONS` | `24` | Máximo de conexiones a Kinesis |
| `FLAGR_RECORDER_KINESIS_FLUSH_INTERVAL` | `5s` | Intervalo de vaciado |
| `FLAGR_RECORDER_KINESIS_BATCH_COUNT` | `500` | Registros por lote |
| `FLAGR_RECORDER_KINESIS_BATCH_SIZE` | `0` | Tamaño del lote en bytes (0 = sin límite) |
| `FLAGR_RECORDER_KINESIS_AGGREGATE_BATCH_COUNT` | `4294967295` | Recuento de lotes agregados |
| `FLAGR_RECORDER_KINESIS_AGGREGATE_BATCH_SIZE` | `51200` | Tamaño del lote agregado en bytes |
| `FLAGR_RECORDER_KINESIS_VERBOSE` | `false` | Registro detallado de Kinesis |

#### Configuración de Pubsub

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_RECORDER_PUBSUB_PROJECT_ID` | _(vacío)_ | ID del proyecto de Google Cloud |
| `FLAGR_RECORDER_PUBSUB_TOPIC_NAME` | `flagr-records` | Nombre del topic de Pubsub |
| `FLAGR_RECORDER_PUBSUB_KEYFILE` | _(vacío)_ | Ruta del archivo de clave JSON de la cuenta de servicio |
| `FLAGR_RECORDER_PUBSUB_VERBOSE` | `false` | Registro detallado de Pubsub |
| `FLAGR_RECORDER_PUBSUB_VERBOSE_CANCEL_TIMEOUT` | `5s` | Tiempo de espera de cancelación para el registro detallado |

### Notificaciones

Notificaciones por webhook ante cambios en los flags. Consulta [Notificaciones](flagr_notifications) para conocer el formato del payload y los disparadores.

| Variable | Predeterminado | Descripción |
|----------|---------|-------------|
| `FLAGR_NOTIFICATION_WEBHOOK_ENABLED` | `false` | Habilitar las notificaciones por webhook salientes |
| `FLAGR_NOTIFICATION_WEBHOOK_URL` | _(vacío)_ | URL de destino para los webhooks `POST` |
| `FLAGR_NOTIFICATION_WEBHOOK_HEADERS` | _(vacío)_ | Cabeceras HTTP adicionales, separadas por comas (p. ej. `Authorization: Bearer x`) |
| `FLAGR_NOTIFICATION_TIMEOUT` | `10s` | Tiempo de espera global por notificación, incluidos los reintentos |
| `FLAGR_NOTIFICATION_DETAILED_DIFF_ENABLED` | `false` | Incrustar `pre_value`/`post_value`/`diff` en el payload |
| `FLAGR_NOTIFICATION_MAX_RETRIES` | `3` | Intentos de reintento ante fallos transitorios; `0` desactiva los reintentos |
| `FLAGR_NOTIFICATION_RETRY_BASE` | `1s` | Retardo base para el backoff exponencial entre reintentos |
| `FLAGR_NOTIFICATION_RETRY_MAX` | `10s` | Retardo máximo entre reintentos |
