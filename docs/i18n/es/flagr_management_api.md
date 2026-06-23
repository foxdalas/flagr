# API de gestión

Todo lo que haces en la UI —crear un flag, añadir variantes y segmentos, editar restricciones, definir una distribución, activar un flag— es una llamada REST que también puedes hacer directamente. Esta es la API que debes usar para **automatización, CI/CD, scripting y sembrar entornos**. (Para *evaluar* flags desde tu aplicación, usa la [API de evaluación](flagr_eval_api) en su lugar.)

- **Ruta base:** `/api/v1`
- **Tipo de contenido:** `application/json`
- **Esquema completo:** la [referencia de la API](api) interactiva (`/api_docs`) lista cada endpoint, campo y respuesta — esta página es la guía práctica.

!> La API de gestión **no se expone** en los [nodos de solo evaluación](flagr_eval_api) (`FLAGR_EVAL_ONLY_MODE=true`). Úsala contra tu instancia de gestión. Protege la instancia de gestión con [autenticación](flagr_deployment) — por defecto, estos endpoints de escritura están abiertos.

## La jerarquía de recursos

Un flag posee todo lo que cuelga de él:

```
flag
├── variants        (los posibles valores de retorno)
├── tags            (etiquetas para búsqueda y evaluación basada en etiquetas)
└── segments        (reglas de segmentación ordenadas)
    ├── constraints (quién está en el segmento — combinadas con AND)
    └── distribution (cómo se reparte el tráfico coincidente entre las variantes)
```

Cada nivel tiene sus propios endpoints, siempre anidados bajo el flag padre.

## Flags

| Método y ruta | Propósito |
|---|---|
| `GET /flags` | Lista los flags. Filtros: `enabled`, `description`, `tags`, `key`, `deleted`, `preload`, `limit`, `offset` |
| `POST /flags` | Crea un flag (`description`, `key` opcional) |
| `GET /flags/{flagID}` | Obtiene un flag con todos sus hijos |
| `PUT /flags/{flagID}` | Actualiza `description`, `key`, `dataRecordsEnabled`, `entityType`, `notes` |
| `PUT /flags/{flagID}/enabled` | Activa o desactiva el flag (`{"enabled": true}`) — el interruptor de emergencia |
| `DELETE /flags/{flagID}` | Borrado lógico del flag |
| `PUT /flags/{flagID}/restore` | Restaura un flag borrado lógicamente |
| `GET /flags/entity_types` | Lista los distintos tipos de entidad en uso |

```bash
# Crear un flag y luego volver a leerlo
curl -X POST http://localhost:18000/api/v1/flags \
  -H 'Content-Type: application/json' \
  -d '{"description": "New checkout flow", "key": "checkout-redesign"}'
# → { "id": 42, "key": "checkout-redesign", ... }
```

!> Crear un flag **no** lo activa. Un flag nuevo está desactivado y no devuelve ninguna variante hasta que le añades variantes/segmentos/una distribución y llamas a `.../enabled`.

## Variantes

| Método y ruta | Propósito |
|---|---|
| `GET /flags/{flagID}/variants` | Lista las variantes |
| `POST /flags/{flagID}/variants` | Crea una variante (`key`, `attachment` opcional) |
| `PUT /flags/{flagID}/variants/{variantID}` | Actualiza la clave o el adjunto |
| `DELETE /flags/{flagID}/variants/{variantID}` | Elimina una variante |

```bash
curl -X POST http://localhost:18000/api/v1/flags/42/variants \
  -H 'Content-Type: application/json' \
  -d '{"key": "treatment", "attachment": {"color": "#22c55e"}}'
```

El `attachment` es JSON arbitrario que se devuelve junto con la variante en el momento de la evaluación — consulta [configuración dinámica](flagr_use_cases).

## Segmentos

Los segmentos se evalúan **en orden**; gana el primero cuyas restricciones coinciden (consulta [Cómo funciona la evaluación](flagr_evaluation)).

| Método y ruta | Propósito |
|---|---|
| `GET /flags/{flagID}/segments` | Lista los segmentos en orden de evaluación |
| `POST /flags/{flagID}/segments` | Crea un segmento (`description`, `rolloutPercent`) |
| `PUT /flags/{flagID}/segments/{segmentID}` | Actualiza la descripción o la cobertura |
| `DELETE /flags/{flagID}/segments/{segmentID}` | Elimina un segmento (y sus restricciones/distribución) |
| `PUT /flags/{flagID}/segments/reorder` | Reordena por ID: `{"segmentIDs": [3, 1, 2]}` |

## Restricciones

Las restricciones definen *quién* está en un segmento; todas las restricciones de un segmento se combinan con `AND`. Consulta [Operadores de restricción](flagr_operators) para las reglas de operador/valor.

| Método y ruta | Propósito |
|---|---|
| `GET /flags/{flagID}/segments/{segmentID}/constraints` | Lista las restricciones |
| `POST /flags/{flagID}/segments/{segmentID}/constraints` | Añade una restricción (`property`, `operator`, `value`) |
| `PUT /…/constraints/{constraintID}` | Actualiza una restricción |
| `DELETE /…/constraints/{constraintID}` | Elimina una restricción |

```bash
curl -X POST http://localhost:18000/api/v1/flags/42/segments/100/constraints \
  -H 'Content-Type: application/json' \
  -d '{"property": "country", "operator": "EQ", "value": "\"US\""}'
```

!> Los valores de tipo cadena deben ir entre comillas *dentro* de la cadena JSON — `"value": "\"US\""`, no `"value": "US"`. Un valor sin comillas se interpreta como una variable y nunca coincide. [Referencia de operadores](flagr_operators).

## Distribución

Un segmento tiene **una** distribución; la reemplazas por completo. Los porcentajes deben sumar **100**.

| Método y ruta | Propósito |
|---|---|
| `GET /flags/{flagID}/segments/{segmentID}/distributions` | Lee la distribución actual |
| `PUT /flags/{flagID}/segments/{segmentID}/distributions` | La reemplaza |

```bash
curl -X PUT http://localhost:18000/api/v1/flags/42/segments/100/distributions \
  -H 'Content-Type: application/json' \
  -d '{"distributions": [
        {"variantID": 200, "variantKey": "control",   "percent": 50},
        {"variantID": 201, "variantKey": "treatment", "percent": 50}
      ]}'
```

## Etiquetas

| Método y ruta | Propósito |
|---|---|
| `GET /flags/{flagID}/tags` | Lista las etiquetas de un flag |
| `POST /flags/{flagID}/tags` | Añade una etiqueta (`value`) |
| `DELETE /flags/{flagID}/tags/{tagID}` | Quita una etiqueta |
| `GET /tags` | Lista todas las etiquetas de todos los flags |

Las etiquetas alimentan la [evaluación masiva basada en etiquetas](flagr_eval_api) y la búsqueda.

## Historial y detección de cambios

| Método y ruta | Propósito |
|---|---|
| `GET /flags/{flagID}/snapshots` | El historial de revisiones del flag (cada cambio de configuración, quién y cuándo) — los datos detrás de la pestaña Historial de la UI |
| `GET /flags/snapshots/max_id` | Un único contador monótonamente creciente sobre *toda* la configuración de flags. Sondéalo para detectar de forma barata «¿cambió algo?» sin tener que comparar diferencias |

`max_id` es la alternativa ligera al `ETag` de la API de evaluación: si el número no se ha movido, ninguna configuración de flag ha cambiado.

## Exportación

| Método y ruta | Propósito |
|---|---|
| `GET /export/sqlite` | Descarga toda la base de datos de flags como un archivo SQLite |
| `GET /export/eval_cache/json` | Exporta la caché de evaluación en memoria como JSON |

`export/eval_cache/json` admite filtros —`ids`, `keys`, `enabled`, `tags` o `all`— y produce exactamente el formato de [fuente de flags JSON](flagr_json_flag_spec). El patrón habitual es **exportar desde una instancia de gestión → servirlo a los nodos de evaluación de solo lectura** mediante el driver `json_file` / `json_http`:

```bash
curl 'http://localhost:18000/api/v1/export/eval_cache/json?enabled=true' > flags.json
```

## Un flag completo, de principio a fin

```bash
BASE=http://localhost:18000/api/v1
# 1. crear el flag
FID=$(curl -s -X POST $BASE/flags -d '{"key":"checkout-redesign","description":"New checkout"}' | jq .id)
# 2. variantes
curl -s -X POST $BASE/flags/$FID/variants -d '{"key":"control"}'
curl -s -X POST $BASE/flags/$FID/variants -d '{"key":"treatment"}'
# 3. un segmento con cobertura del 100%
SID=$(curl -s -X POST $BASE/flags/$FID/segments -d '{"description":"all","rolloutPercent":100}' | jq .id)
# 4. una distribución 50/50 (usa los IDs de variante devueltos arriba)
curl -s -X PUT $BASE/flags/$FID/segments/$SID/distributions -d '{"distributions":[...]}'
# 5. activarlo
curl -s -X PUT $BASE/flags/$FID/enabled -d '{"enabled":true}'
```

Tras cualquier escritura, deja pasar un [refresco de la caché de evaluación](flagr_env) (~3 s) antes de que las evaluaciones reflejen el cambio.
