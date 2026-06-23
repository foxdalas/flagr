# OFREP (OpenFeature)

Flagr implementa el **OpenFeature Remote Evaluation Protocol (OFREP)** — un contrato HTTP neutral respecto al proveedor para la evaluación de flags. Si ya usas un SDK de [OpenFeature](https://openfeature.dev), apunta su proveedor OFREP a Flagr y evalúa los flags a través de la API estándar de OpenFeature — sin necesidad de ningún cliente específico de Flagr.

OFREP está **habilitado por defecto**. Para deshabilitarlo, usa `FLAGR_OFREP_ENABLED=false`.

| | |
|---|---|
| Flag individual | `POST /ofrep/v1/evaluate/flags/{key}` |
| Todos los flags (bulk) | `POST /ofrep/v1/evaluate/flags` |

Ambos endpoints son únicamente `POST` (cualquier otro método devuelve `405`).

## Evaluar un solo flag

`POST /ofrep/v1/evaluate/flags/{key}`

El cuerpo lleva un **contexto** de evaluación de OpenFeature. `targetingKey` es obligatorio — es el identificador de entidad que Flagr usa para la [cobertura/distribución](flagr_overview) determinista; todo lo demás se convierte en contexto de [restricciones](flagr_operators).

```sh
curl -X POST http://localhost:18000/ofrep/v1/evaluate/flags/checkout-redesign \
  -H 'Content-Type: application/json' \
  -d '{ "context": { "targetingKey": "user-123", "state": "CA", "age": 31 } }'
```

Respuesta (`200 OK`):

```json
{
  "key": "checkout-redesign",
  "reason": "TARGETING_MATCH",
  "variant": "treatment",
  "value": "treatment",
  "metadata": { "flagId": 42, "description": "New checkout flow", "tag:frontend": true }
}
```

| Campo | Descripción |
|-------|-------------|
| `key` | La clave del flag. |
| `reason` | Por qué se devolvió este resultado (ver más abajo). |
| `variant` | La clave de la variante asignada (se omite cuando no hay variante). |
| `value` | El valor resuelto (consulta **Resolución de `value`** más abajo). |
| `metadata` | Metadatos del flag: `flagId`, `description` y una entrada `tag:<value>: true` por cada etiqueta. |

### Códigos de motivo (reason)

| `reason` | Significado |
|----------|---------|
| `TARGETING_MATCH` | Coincidió con un segmento que tiene restricciones. |
| `SPLIT` | Coincidió con un segmento sin restricciones y se asignó por distribución. |
| `STATIC` | Coincidió con un segmento **sin restricciones** **y** el flag tiene exactamente una variante — es decir, un resultado fijo e incondicional. (Un flag de una sola variante cuyo segmento coincidente *sí* tiene restricciones devuelve `TARGETING_MATCH` en su lugar.) |
| `DISABLED` | El flag está deshabilitado. |
| `UNKNOWN` | Ningún segmento coincidió. |

### Resolución de `value`

OpenFeature espera un valor tipado. Flagr lo resuelve a partir del **adjunto** de la variante:

- Si el adjunto tiene un campo `value`, se devuelve ese campo (de cualquier tipo JSON — cadena, número, booleano, objeto).
- En caso contrario, se devuelve la **clave de la variante** como valor de tipo cadena.

Así que, para servir un flag tipado (p. ej. un número o un booleano) a través de OpenFeature, dale a la variante un adjunto como `{ "value": 42 }` o `{ "value": true }`. Para un flag de tipo cadena sencillo, basta con la clave de la variante.

## Evaluar todos los flags (bulk)

`POST /ofrep/v1/evaluate/flags`

Mismo cuerpo de contexto; evalúa todos los flags **habilitados** y los devuelve bajo `flags`:

```json
{
  "flags": [
    { "key": "checkout-redesign", "reason": "SPLIT", "variant": "control", "value": "control", "metadata": { "flagId": 42 } },
    { "key": "dark-mode", "reason": "DISABLED", "value": "off", "metadata": { "flagId": 43 } }
  ]
}
```

### Caché con ETag

El endpoint bulk devuelve un `ETag` que cambia cada vez que cambia la configuración de los flags. Reenvíalo como `If-None-Match` y Flagr responderá con `304 Not Modified` cuando nada haya cambiado — así un proveedor de OpenFeature puede sondear de forma barata y solo volver a descargar cuando haya cambios reales.

```sh
# First call returns an ETag header, e.g. ETag: "1718971200000"
curl -i -X POST http://localhost:18000/ofrep/v1/evaluate/flags \
  -H 'Content-Type: application/json' \
  -d '{ "context": { "targetingKey": "user-123" } }'

# Subsequent polls: 304 Not Modified (empty body) while config is unchanged
curl -i -X POST http://localhost:18000/ofrep/v1/evaluate/flags \
  -H 'Content-Type: application/json' \
  -H 'If-None-Match: "1718971200000"' \
  -d '{ "context": { "targetingKey": "user-123" } }'
```

## Errores

Los fallos usan los códigos de error de OpenFeature. El error de un solo flag incluye la `key`:

```json
{ "key": "checkout-redesign", "errorCode": "FLAG_NOT_FOUND" }
```

| `errorCode` | Cuándo |
|-------------|------|
| `PARSE_ERROR` | El cuerpo de la petición no es JSON válido. |
| `INVALID_CONTEXT` | No se proporcionó ningún objeto `context`. |
| `TARGETING_KEY_MISSING` | Falta `context.targetingKey` o está vacío. |
| `FLAG_NOT_FOUND` | Clave de flag desconocida (solo en la evaluación individual). |

## OFREP vs. la API de evaluación nativa

Ambas evalúan los mismos flags con el mismo motor. Usa **OFREP** cuando quieras integrarte en el ecosistema de OpenFeature y mantener tu código neutral respecto al proveedor; usa la [API de evaluación nativa](flagr_eval_api) cuando quieras la respuesta más rica de Flagr (logs de depuración, IDs de segmento, IDs de snapshot, evaluación masiva sobre varias entidades).
