# API de evaluación

La evaluación es la forma en que tu aplicación le pregunta a Flagr *«para esta entidad, ¿qué variante de este flag está activa?»*. Es una simple petición HTTP — no hace falta ningún SDK, aunque existen SDK de la comunidad para varios lenguajes.

!> ¿Prefieres el estándar OpenFeature? Flagr también habla [OFREP](flagr_ofrep) en `/ofrep/v1/...`, así que puedes usar cualquier SDK de OpenFeature.

## Evaluación individual

`POST /api/v1/evaluation`

```sh
curl -X POST http://localhost:18000/api/v1/evaluation \
  -H 'Content-Type: application/json' \
  -d '{
    "entityID": "user-123",
    "entityType": "user",
    "entityContext": { "state": "CA", "age": 31 },
    "flagKey": "checkout-redesign",
    "enableDebug": true
  }'
```

### Campos de la petición

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `entityID` | string | Identificador estable de la entidad. **Determina el bucket de cobertura/distribución** — el mismo `entityID` recibe siempre la misma variante. Si se omite, Flagr genera uno aleatorio (no persistente). |
| `entityType` | string | Etiqueta opcional para la entidad (p. ej. `user`, `device`). Se registra junto con las métricas. **Si el propio flag tiene un Entity Type definido, ese valor prevalece y anula el que envíes aquí.** |
| `entityContext` | object | Atributos contra los que se comprueban las [restricciones](flagr_operators) del segmento. Los nombres de `property` de las restricciones se resuelven contra las claves *dentro* de `entityContext` — una restricción sobre `country` lee `entityContext.country`, no un campo de nivel superior. |
| `flagKey` | string | Identifica el flag por su clave… |
| `flagID` | integer | …o por su ID numérico. Cualquiera de los dos resuelve al mismo flag. |
| `enableDebug` | boolean | Cuando es `true`, la respuesta incluye `evalDebugLog`, que explica por qué coincidió o no cada segmento. |

### Campos de la respuesta

```json
{
  "flagID": 42,
  "flagKey": "checkout-redesign",
  "flagTags": ["checkout", "web"],
  "flagSnapshotID": 7,
  "segmentID": 100,
  "variantID": 200,
  "variantKey": "treatment",
  "variantAttachment": { "color": "#42b983" },
  "timestamp": "2026-06-22T12:00:00Z",
  "dataRecordsEnabled": false,
  "evalDebugLog": { "segmentDebugLogs": [], "msg": "" }
}
```

| Campo | Descripción |
|-------|-------------|
| `variantKey` / `variantID` | La variante asignada. **Vacío / `0` significa que no hay variante** — trátalo como tu valor por defecto. |
| `variantAttachment` | El adjunto JSON de la variante, para [configuración dinámica](flagr_use_cases). |
| `segmentID` | Qué segmento coincidió (`0` si ninguno). |
| `flagTags` | Las etiquetas del flag que coincidió (se devuelven tal cual; útil cuando seleccionaste los flags por etiqueta). |
| `flagSnapshotID` | La revisión del flag que se usó — útil para correlacionar con la pestaña de [historial](flagr_overview). |
| `dataRecordsEnabled` | Indica si esta evaluación se registró en el pipeline de métricas. |
| `evalDebugLog` | Traza de coincidencia por segmento. Solo se rellena cuando se dan **ambas** condiciones: `enableDebug: true` en la petición **y** `FLAGR_EVAL_DEBUG_ENABLED=true` en el servidor (el valor por defecto). |

Tu código se ramifica según `variantKey`:

```js
const res = await fetch(`${FLAGR}/api/v1/evaluation`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    entityID: userId,
    flagKey: "checkout-redesign",
    entityContext: { state },
  }),
}).then((r) => r.json());

if (res.variantKey === "treatment") {
  // new experience
} else {
  // control / default — also the path when no variant matched
}
```

!> **Maneja siempre el caso «sin variante».** Un flag deshabilitado, una entidad que no coincide con ningún segmento o una que queda fuera de la cobertura devuelven todos un `variantKey` vacío. Trátalo como tu valor por defecto seguro. Consulta [Cómo funciona la evaluación](flagr_evaluation).

## Evaluación masiva (batch)

Evalúa muchas entidades o muchos flags en un solo viaje de ida y vuelta.

`POST /api/v1/evaluation/batch`

```json
{
  "entities": [
    { "entityID": "u1", "entityContext": { "state": "CA" } },
    { "entityID": "u2", "entityContext": { "state": "NY" } }
  ],
  "flagIDs": [42, 43],
  "enableDebug": false
}
```

La respuesta es `{ "evaluationResults": [ ... ] }`, con un `evalResult` por cada par (entidad × flag seleccionado).

!> `FLAGR_EVAL_BATCH_SIZE` limita `entities × flags` para proteger el servidor (valor por defecto `0` = sin límite). Las peticiones que superan el límite se rechazan.

### GET batch (apto para lambdas)

`GET /api/v1/evaluation/batch` toma la selección mediante parámetros de consulta, para quienes solo pueden hacer peticiones GET (CDN, runtimes de borde). Admite `ETag` / `If-None-Match`, de modo que una configuración de flags sin cambios devuelve `304 Not Modified` — barato de sondear.

Los nombres de los parámetros de consulta difieren del cuerpo POST y todos son repetibles (multivalor):

| Parámetro de consulta | Equivale a |
|-------------|---------|
| `entityId` | el ID de la entidad (una sola entidad por petición) |
| `flagId` / `flagKey` | selecciona los flags por ID o por clave |
| `flagTag` | selecciona los flags por etiqueta (repite para varias) |
| `flagTagQuery` | `ANY` (por defecto) o `ALL` — cómo se combinan los valores de `flagTag` |

Dos limitaciones de GET frente al batch POST:

- **Una sola entidad por petición** (`entityId`), y su **`entityType` es siempre `user`** — no puedes definir un tipo de entidad personalizado en la forma GET.
- El contexto de la entidad se pasa como parámetros de consulta adicionales (cada uno se convierte en una clave de contexto).

## Seleccionar qué flags evaluar

Elige uno de estos:

- **`flagKey`** / **`flagKeys`** — el más legible; estable entre entornos.
- **`flagID`** / **`flagIDs`** — numérico; coincide con la URL del flag en la UI.
- **`flagTags`** con **`flagTagsOperator`** — evalúa todos los flags que llevan estas etiquetas. `ANY` (valor por defecto) = tiene al menos una de las etiquetas; `ALL` = las tiene todas. Ideal para «evaluar todos los flags de esta superficie».

!> **La selección por etiqueta es exclusiva del batch.** Un `POST /api/v1/evaluation` individual resuelve un flag únicamente por `flagID`/`flagKey` — ignora `flagTags`. Para evaluar por etiqueta, usa el endpoint batch.

## Determinismo: envía un entityID estable

La cobertura y la distribución son deterministas en función de `entityID`: la misma entidad cae siempre en el mismo bucket, así que un usuario conserva la misma variante entre peticiones y reinicios. Envía un identificador **estable** (ID de usuario, ID de cuenta, ID de dispositivo) — no un valor aleatorio por petición — o se pierde el comportamiento persistente. Consulta [Resumen → Cobertura](flagr_overview).

## Nodos de evaluación de solo lectura

Para configuraciones de alto tráfico, ejecuta instancias de evaluación dedicadas con `FLAGR_EVAL_ONLY_MODE=true`: sirven `/api/v1/evaluation*` (y [OFREP](flagr_ofrep)) desde la caché en memoria y deshabilitan la API CRUD/de gestión. Combínalas con una instancia de gestión separada que se encargue de las escrituras.

## Bibliotecas cliente

Los SDK de la comunidad (Go, JavaScript, Python, Ruby) envuelven estos endpoints — consulta el README del proyecto. Para OpenFeature, apunta cualquier SDK de OpenFeature al endpoint [OFREP](flagr_ofrep) de Flagr; no hace falta ningún cliente específico de Flagr.
