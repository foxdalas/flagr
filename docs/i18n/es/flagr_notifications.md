# Notificaciones

Flagr ofrece un sistema de notificaciones integrado que te permite monitorizar en tiempo real los cambios y actualizaciones de tus recursos operativos. Puedes configurar Flagr para que envíe webhooks HTTP `POST` cada vez que un flag se crea, actualiza, elimina o restaura.

## Operaciones monitorizadas

Flagr emite una notificación ante cada cambio en un flag **y en cualquiera de sus partes** — segmentos, variantes, restricciones, distribuciones y etiquetas. Cada notificación lleva dos campos que, juntos, indican exactamente qué ocurrió: una **`operation`** y un **`component_type`**.

| `operation` | Significado |
|-----------|-------------|
| `create` | Se creó un flag o una de sus partes |
| `update` | Se modificó un flag o una de sus partes |
| `delete` | Se eliminó un flag (soft-delete) o una de sus partes |
| `restore` | Se restauró un flag eliminado de forma lógica |

| `component_type` | La parte que cambió |
|------------------|-----------------------|
| `flag` | El flag en sí — metadatos, estado de activación |
| `segment` · `variant` · `constraint` · `distribution` · `tag` | Ese hijo concreto del flag |

Los dos campos se combinan, de modo que la notificación es precisa sobre el subcambio:

- Añadir una variante → `operation: create`, `component_type: variant`
- Editar la cobertura de un segmento → `operation: update`, `component_type: segment`
- Quitar una etiqueta → `operation: delete`, `component_type: tag`
- Activar/desactivar el flag → `operation: update`, `component_type: flag`

Toda notificación incluye además el `flag_id` / `flag_key` del flag padre, de modo que un receptor puede agrupar los cambios de los hijos bajo su flag.

## Configuración

Para habilitar las notificaciones, define las siguientes variables de entorno:

- `FLAGR_NOTIFICATION_WEBHOOK_ENABLED=true` (Por defecto: `false`) — Habilita las notificaciones por webhook.
- `FLAGR_NOTIFICATION_WEBHOOK_URL=https://api.your-org.com/webhooks/flagr` — Endpoint HTTP de destino para las peticiones POST.
- `FLAGR_NOTIFICATION_WEBHOOK_HEADERS=Authorization: Bearer secret-token, X-Custom-Header: value` — (Opcional) Cabeceras HTTP personalizadas separadas por comas, que suelen usarse para proteger el receptor de tu webhook con un token de API.
- `FLAGR_NOTIFICATION_TIMEOUT=10s` (Por defecto: `10s`) — Tiempo de espera global para entregar una sola notificación, **incluidos todos los reintentos** (no solo la conexión inicial).
- `FLAGR_NOTIFICATION_DETAILED_DIFF_ENABLED=true` (Por defecto: `false`) — Cuando está habilitado, Flagr incrusta en el payload de la notificación el diff JSON visual exacto del flag modificado.
- `FLAGR_NOTIFICATION_MAX_RETRIES=3` (Por defecto: `3`) — Número máximo de reintentos ante fallos transitorios (errores de red/transporte y respuestas 5xx). Ponlo a `0` para desactivar los reintentos.
- `FLAGR_NOTIFICATION_RETRY_BASE=1s` (Por defecto: `1s`) — Retardo base para el backoff exponencial entre reintentos.
- `FLAGR_NOTIFICATION_RETRY_MAX=10s` (Por defecto: `10s`) — Retardo máximo entre reintentos.

### Concurrencia y observabilidad

- Las notificaciones se envían de forma asíncrona con un límite de concurrencia fijo de 100 (no configurable), para evitar agotar los recursos bajo carga.
- La métrica `notification.sent` se emite cuando statsd está habilitado, etiquetada con `provider`, `operation` y `status` (`success`/`failure`).

### Notas importantes

- **Entrega asíncrona**: las notificaciones se envían en goroutines en segundo plano. Los fallos se registran, pero **no afectan a la respuesta de la API**.
- **Validación en el arranque**: Flagr valida la configuración de notificaciones al arrancar y registra una advertencia si `FLAGR_NOTIFICATION_WEBHOOK_URL` no está definida mientras los webhooks están habilitados.
- **Descarte silencioso**: si los webhooks están habilitados pero falta la URL, las notificaciones se descartan en silencio. Se registra una advertencia en el arranque para ayudar a diagnosticar la mala configuración.

## Formato del payload del webhook

El endpoint de destino recibe un payload JSON estructurado:

```json
{
  "operation": "update",
  "flag_id": 123,
  "flag_key": "my-feature-flag",
  "component_type": "segment",
  "component_id": 7,
  "component_key": "power-users",
  "pre_value": "...",
  "post_value": "...",
  "diff": "--- Previous\n+++ Current\n@@ ...",
  "user": "admin@example.com",
  "timestamp": "2026-04-26T18:51:03Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `operation` | string | `create`, `update`, `delete` o `restore` |
| `flag_id` | uint | ID en base de datos del flag padre |
| `flag_key` | string | Clave única del flag padre |
| `component_type` | string | Qué parte del flag cambió: `flag`, `segment`, `variant`, `constraint`, `distribution` o `tag` |
| `component_id` | uint | ID en base de datos del componente que cambió |
| `component_key` | string | Clave/nombre del componente que cambió (p. ej. clave de variante, valor de etiqueta) |
| `pre_value` | string | JSON del snapshot anterior del flag (solo si `FLAGR_NOTIFICATION_DETAILED_DIFF_ENABLED=true`)
| `post_value` | string | JSON del snapshot actual del flag (solo si `FLAGR_NOTIFICATION_DETAILED_DIFF_ENABLED=true`)
| `diff` | string | Diff unificado entre el estado anterior y el actual (solo si `FLAGR_NOTIFICATION_DETAILED_DIFF_ENABLED=true`)
| `user` | string | Identidad del usuario que realizó el cambio |
| `timestamp` | string | Marca de tiempo UTC del cambio en formato RFC 3339 |
