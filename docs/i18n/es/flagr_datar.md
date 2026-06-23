# Analítica y registros de datos

Flagr puede hacer dos cosas con cada resultado de evaluación — de forma independiente o conjunta. Ambas son **recorders**, que se activan con `FLAGR_RECORDER_ENABLED=true` y se seleccionan (separadas por comas) mediante `FLAGR_RECORDER_TYPE`:

- **Analítica integrada (`datar`)** — lleva la cuenta en memoria y la expone a través de dos endpoints REST. Cero dependencias externas. Se trata primero, más abajo.
- **Streaming (`kafka` / `kinesis` / `pubsub`)** — emite cada resultado a un pipeline externo para tu propio almacén de datos o plataforma de experimentación. Consulta **Registros en streaming** al final de esta página.

Sea cual sea la que uses, el **interruptor por flag `dataRecordsEnabled` controla el registro de ese flag en *todos* los recorders** — defínelo en la UI (el control *Data records* del editor de flags) o mediante `PUT /api/v1/flags/{id}`. Un flag con el registro desactivado nunca se escribe en Datar, Kafka, Kinesis ni Pub-Sub.

## Analítica integrada (Datar)

Datar es un motor opcional de analítica agregada en memoria integrado en Flagr. Cuenta las evaluaciones por flag, variante, segmento y hora, y luego expone los resultados a través de dos endpoints REST: sin pipeline externo, sin consumidor de Kafka y sin un stack de analítica aparte.

## Cuándo usarlo

Una solución sencilla y sin dependencias para una analítica agregada básica. Úsalo cuando necesites recuentos básicos de evaluaciones desglosados por variante y segmento sin tener que montar un pipeline externo.

Prometheus cubre bien las métricas basadas en tasas y las series temporales a nivel de variante, pero no puede indexar por `segment_id` debido a su alta cardinalidad. Usa Datar cuando necesites:

- **Desgloses por segmento**: cuántas evaluaciones recibió cada segmento
- **Totales históricos**: recuentos acumulados (no solo tasas) a lo largo de días o semanas
- **Paneles por flag**: una vista resumida y sencilla de todos los flags sin montar un stack de analítica aparte

## Cómo habilitarlo

Requiere `FLAGR_RECORDER_ENABLED=true`. Con el interruptor maestro activado, indica `datar` en `RecorderType` para activar el agregador en memoria:

```bash
export FLAGR_RECORDER_ENABLED=true
export FLAGR_RECORDER_TYPE=kafka,datar
export FLAGR_RECORDER_DATAR_FLUSH_INTERVAL=60s    # default
```

La tabla `datar_hourly_events` se crea automáticamente mediante AutoMigrate en el arranque. No hace falta ninguna migración de esquema.


## Registro de datos
El registro de datos de Datar depende de tres condiciones:

1. `FLAGR_RECORDER_ENABLED=true` (interruptor maestro)
2. Incluir `datar` en `FLAGR_RECORDER_TYPE`
3. El interruptor por flag `dataRecordsEnabled: true` (configurable mediante `PUT /api/v1/flags/{id}`)


Esto significa que puedes habilitar el registro de forma selectiva por flag, incluso cuando Datar está habilitado globalmente.

> **Nota:** después de crear o actualizar un flag, espera al menos un ciclo de refresco de la caché de evaluación (~3 s por defecto) antes de enviar evaluaciones. La caché de evaluación necesita recoger la configuración del nuevo flag; de lo contrario, las evaluaciones devolverán "not found" y no llegarán al recorder de Datar.

## Endpoints

### GET /api/v1/datar/summary

Devuelve los flags con sus totales agregados en una ventana de tiempo. **Solo aparecen los flags que tuvieron tráfico de evaluación real en la ventana**: los flags sin tráfico quedan excluidos.

| Parámetro | Tipo | Por defecto | Descripción |
|-------|------|---------|-------------|
| `from` | RFC 3339 | hace 7 días | Inicio de la ventana de tiempo |
| `to` | RFC 3339 | ahora | Fin de la ventana de tiempo |
| `limit` | int | 100 | Máximo de resultados |
| `offset` | int | 0 | Desplazamiento de los resultados |

Respuesta:

```json
{
  "flags": [
    {
      "flagID": 1,
      "flagKey": "my-feature",
      "enabled": true,
      "description": "Controls feature X",
      "totalEvalCount": 45283,
      "lastEvaluatedAt": "2026-05-22T14:30:00Z"
    }
  ]
}
```

### GET /api/v1/datar/flags/{flagID}/summary

Desglose detallado de un único flag. Devuelve el tráfico agrupado por variante, segmento y día; los tres arrays vienen ordenados (de forma descendente por recuento para variante/segmento, y ascendente por fecha para el día).

| Parámetro | Tipo | Por defecto | Descripción |
|-------|------|---------|-------------|
| `from` | RFC 3339 | hace 7 días | Inicio de la ventana de tiempo |
| `to` | RFC 3339 | ahora | Fin de la ventana de tiempo |

Respuesta:

```json
{
  "flagID": 1,
  "trafficByVariant": [
    { "variantID": 1, "count": 30188 },
    { "variantID": 2, "count": 15095 }
  ],
  "trafficBySegment": [
    { "segmentID": 10, "count": 30188 },
    { "segmentID": 20, "count": 15095 }
  ],
  "trafficByDay": [
    { "date": "2026-05-21", "count": 22100 },
    { "date": "2026-05-22", "count": 23183 }
  ]
}
```

## Modelo de datos

Los recuentos se agrupan por hora mediante `time.Now().Truncate(time.Hour)`. Cada fila de la tabla `datar_hourly_events` representa una combinación única de:

- `flag_id` — el flag evaluado
- `variant_id` — la variante que coincidió
- `segment_id` — el segmento que coincidió (0 si no coincidió ningún segmento)
- `bucket_hour` — la marca de tiempo de la hora truncada

Un índice único sobre `(flag_id, variant_id, segment_id, bucket_hour)` garantiza que los UPSERT aditivos funcionen correctamente entre instancias concurrentes.

## Uso de recursos

- **CPU**: ~87 ns por evaluación en la ruta caliente (clave ya existente), ~98 ns para claves nuevas; cero asignaciones de memoria
- **RAM**: ~210 bytes por tupla activa (flag, variante, segmento); ~2,1 MB para 10 000 claves
- **Escrituras en BD**: una transacción por lotes en cada intervalo de flush (configurable, 60 s por defecto)
- **Crecimiento de la tabla**: ~2,4 mil filas al mes por cada 100 flags (buckets horarios, sin retención)

## Limitaciones

- Los datos están en memoria hasta el flush periódico. Si el proceso se cae, se pierde como mucho un intervalo de flush de datos agregados (algo aceptable para una analítica de paneles).
- No incluye ninguna política de retención de datos: la tabla crece sin límite. Despliega un cron job o una política de retención si lo necesitas.
- No cuenta entidades únicas (HyperLogLog o similar). Cada evaluación se cuenta una vez, sin importar la identidad de la entidad.

## Registros en streaming

Cuando `FLAGR_RECORDER_TYPE` incluye `kafka`, `kinesis` o `pubsub`, Flagr emite **un mensaje por evaluación** a ese backend (y a varios a la vez si indicas más de uno). Configura los brokers/credenciales en [Configuración del servidor → Data Recorder](flagr_env); esta sección documenta el **formato del mensaje** que recibe tu consumidor.

### Envoltorio del frame

Cada mensaje es un `DataRecordFrame`. Su forma depende de `FLAGR_RECORDER_FRAME_OUTPUT_MODE`:

- **`payload_string`** (por defecto) — el resultado de la evaluación se codifica como JSON dentro de una cadena, de modo que el envoltorio se mantiene estable aunque el esquema del resultado evolucione, y la carga útil se puede cifrar:

```json
{ "payload": "{\"flagID\":42,\"variantKey\":\"treatment\", ... }", "encrypted": false }
```

- **`payload_raw_json`** — el resultado de la evaluación se incrusta como un objeto anidado, más fácil de consultar directamente en un almacén de datos:

```json
{ "payload": { "flagID": 42, "variantKey": "treatment", "...": "..." } }
```

### Carga útil del registro

La carga útil es el mismo **resultado de evaluación** que devuelve la [API de evaluación](flagr_eval_api), más el contexto de la evaluación:

| Campo | Descripción |
|-------|-------------|
| `flagID` / `flagKey` | El flag evaluado |
| `flagSnapshotID` | La revisión del flag que se usó — correlaciona con el log de historial/auditoría |
| `segmentID` | El segmento que coincidió (`0` si ninguno) |
| `variantID` / `variantKey` | La variante asignada (vacío / `0` si ninguna) |
| `variantAttachment` | El adjunto JSON de la variante |
| `evalContext` | El contexto completo de la petición: `entityID`, `entityType`, `entityContext`, … |
| `timestamp` | Cuándo se produjo la evaluación (UTC) |

### Cifrado (solo Kafka)

En el modo `payload_string`, el recorder de **Kafka** puede cifrar la carga útil — define `FLAGR_RECORDER_KAFKA_ENCRYPTED=true` y `FLAGR_RECORDER_KAFKA_ENCRYPTION_KEY`. El frame lleva entonces un texto cifrado en base64 con `"encrypted": true`; tu consumidor lo descifra con la misma clave (AES, esquema `simplebox`). El cifrado solo se aplica al modo `payload_string` — Kinesis y Pub-Sub siempre envían `"encrypted": false`.
