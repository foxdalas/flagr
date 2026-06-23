# Despliegue y operación

Flagr se distribuye como un único binario autocontenido (y una imagen de Docker) que sirve la API y la interfaz web desde un solo puerto (`18000`). Esta página cubre las decisiones que importan cuando lo pones en marcha de verdad: dónde viven los datos, cómo escalar y cómo protegerlo. Cada ajuste mencionado aquí tiene una fila en [Configuración del Servidor](flagr_env).

## Elegir una base de datos

`FLAGR_DB_DBDRIVER` + `FLAGR_DB_DBCONNECTIONSTR` seleccionan el almacén de respaldo:

| Driver | Úsalo para | Notas |
|---|---|---|
| `sqlite3` (por defecto) | Desarrollo local, un solo nodo, demos | Escribe en un **archivo** — solo un nodo (consulta la persistencia más abajo) |
| `mysql` | Producción, múltiples réplicas | Una BD compartida permite el escalado horizontal |
| `postgres` | Producción, múltiples réplicas | Igual que MySQL |
| `json_file` / `json_http` | Nodos de **evaluación** de solo lectura | Carga los flags desde un snapshot JSON; activa automáticamente `FLAGR_EVAL_ONLY_MODE` (sin API de gestión). Consulta [Fuente de flags JSON](flagr_json_flag_spec) |

```bash
export FLAGR_DB_DBDRIVER=mysql
export FLAGR_DB_DBCONNECTIONSTR="user:pass@tcp(mysql:3306)/flagr?parseTime=true"
```

## Persistencia y copias de seguridad

!> **La base de datos SQLite por defecto vive dentro del contenedor y se pierde cuando el contenedor se reemplaza.** La imagen publicada incluso incluye una base de datos *de demostración* en `/data/demo_sqlite3.db`. Si ejecutas la imagen tal cual sin cambiar esto, perderás tus flags de forma silenciosa en el siguiente despliegue.

Para cualquier cosa más allá de una demo desechable:

- **SQLite** — apunta la cadena de conexión a una ruta en un **volumen montado** para que el archivo sobreviva a los reinicios, y haz copias de seguridad de ese archivo. SQLite está bien para un solo nodo, pero no se puede compartir entre réplicas.
- **MySQL / Postgres** — ejecuta una base de datos gestionada/replicada y haz copias de seguridad como con cualquier otro almacén de datos de producción. Este es el camino recomendado para producción.

En cualquier caso, también puedes hacer un snapshot de toda la configuración de flags en cualquier momento mediante `GET /api/v1/export/sqlite` (consulta la [API de gestión](flagr_management_api)).

## Escalado horizontal

Flagr es **sin estado** salvo por la base de datos, así que escalas ejecutando más réplicas detrás de un balanceador de carga — todas apuntando a la **misma** MySQL/Postgres:

- Cada réplica mantiene una **caché de evaluación en memoria** y la refresca desde la BD cada `FLAGR_EVALCACHE_REFRESHINTERVAL` (por defecto **3 s**). Las evaluaciones se sirven enteramente desde esta caché, así que son rápidas y no acceden a la BD en cada petición.
- La contrapartida es el **retardo de propagación**: un cambio de flag hecho en una réplica se vuelve visible en las demás tras como mucho un intervalo de refresco (~3 s). Tenlo en cuenta en las pruebas y los despliegues progresivos.
- **SQLite no puede dar soporte a múltiples réplicas** — su archivo es local a un único nodo. Usa MySQL/Postgres para escalar horizontalmente.

Una topología habitual de alto tráfico: un pequeño despliegue de **gestión** (API completa, dueño de las escrituras) más un gran conjunto de réplicas de **solo evaluación** (`FLAGR_EVAL_ONLY_MODE=true`, o un driver `json_http`) que solo sirven `/api/v1/evaluation*` y [OFREP](flagr_ofrep).

## Proteger la instancia

Por defecto, Flagr **no tiene autenticación** — cualquiera que pueda alcanzarlo puede leer *y escribir* flags. Antes de exponerlo, activa uno de los mecanismos de autenticación (detalles y variables de entorno en [Configuración del Servidor](flagr_env)):

| Mecanismo | Bueno para |
|---|---|
| **Autenticación básica** (`FLAGR_BASIC_AUTH_ENABLED`) | Protección sencilla con credenciales compartidas |
| **JWT** (`FLAGR_JWT_AUTH_ENABLED`) | Tokens por cookie o cabecera desde tu SSO/proxy; admite `HS256`/`HS512`/`RS256` |
| **Autenticación por cabecera** (`FLAGR_HEADER_AUTH_ENABLED`) | Confiar en un proxy upstream que inyecta una cabecera de identidad |

!> Las listas blancas de autenticación pueden dejar accesible la evaluación (y a veces `/api/v1/flags`) por comodidad. **Verifica qué expone la lista blanca que elijas** — confirma que los endpoints de escritura realmente requieren credenciales, p. ej. haz un `curl` a `POST /api/v1/flags` sin token y comprueba que se rechaza.

**CORS:** los valores por defecto son permisivos — `FLAGR_CORS_ALLOWED_ORIGINS=*` con `FLAGR_CORS_ALLOW_CREDENTIALS=true`. Restringe `ALLOWED_ORIGINS` a los orígenes reales de tu UI en producción.

**Perfilado:** `pprof` está activado por defecto en `/debug/pprof/` — no lo dejes accesible públicamente (consulta [Monitorización](flagr_monitoring)).

## Detrás de un proxy inverso

Para servir Flagr bajo una subruta (p. ej. `https://tools.example.com/flagr`), establece `FLAGR_WEB_PREFIX=/flagr`; Flagr elimina el prefijo y la UI construye sus URLs de la API en consecuencia. En el proxy, reenvía las cabeceras estándar `X-Forwarded-*` y asegúrate de que tus orígenes CORS coincidan con el nombre de host público.

## Kubernetes

Ejecuta la imagen como un Deployment normal sin estado apuntando a una MySQL/Postgres compartida, y conecta el [endpoint de comprobación de estado](flagr_monitoring) en ambas probes:

```yaml
livenessProbe:
  httpGet: { path: /api/v1/health, port: 18000 }
readinessProbe:
  httpGet: { path: /api/v1/health, port: 18000 }
```

Escala con `replicas:` y ten presente el retardo de propagación de la caché de ~3 s. Para un conjunto de solo evaluación, establece `FLAGR_EVAL_ONLY_MODE=true` (o usa una fuente `json_http`) en esos pods.

## Estado y observabilidad

`GET /api/v1/health` devuelve `200 {"status":"OK"}` una vez que el servidor está en marcha — úsalo para las probes del balanceador de carga y de Kubernetes. Para métricas, trazado y alertas, consulta [Monitorización y Métricas](flagr_monitoring).
