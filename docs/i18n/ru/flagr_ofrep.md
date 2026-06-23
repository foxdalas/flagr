# OFREP (OpenFeature)

Flagr реализует **OpenFeature Remote Evaluation Protocol (OFREP)** — вендоронезависимый HTTP-контракт для оценки флагов. Если вы уже используете SDK [OpenFeature](https://openfeature.dev), направьте его OFREP-провайдер на Flagr и оценивайте флаги через стандартный API OpenFeature — специфичный для Flagr клиент не нужен.

OFREP **включён по умолчанию**. Отключить его можно через `FLAGR_OFREP_ENABLED=false`.

| | |
|---|---|
| Один флаг | `POST /ofrep/v1/evaluate/flags/{key}` |
| Все флаги (bulk) | `POST /ofrep/v1/evaluate/flags` |

Оба эндпоинта принимают только `POST` (любой другой метод возвращает `405`).

## Оценка одного флага

`POST /ofrep/v1/evaluate/flags/{key}`

Тело запроса несёт **контекст** оценки OpenFeature. `targetingKey` обязателен — это идентификатор сущности, который Flagr использует для детерминированного [охвата/распределения](flagr_overview); всё остальное становится контекстом для [условий](flagr_operators).

```sh
curl -X POST http://localhost:18000/ofrep/v1/evaluate/flags/checkout-redesign \
  -H 'Content-Type: application/json' \
  -d '{ "context": { "targetingKey": "user-123", "state": "CA", "age": 31 } }'
```

Ответ (`200 OK`):

```json
{
  "key": "checkout-redesign",
  "reason": "TARGETING_MATCH",
  "variant": "treatment",
  "value": "treatment",
  "metadata": { "flagId": 42, "description": "New checkout flow", "tag:frontend": true }
}
```

| Поле | Описание |
|-------|-------------|
| `key` | Ключ флага. |
| `reason` | Почему вернулся такой результат (см. ниже). |
| `variant` | Ключ назначенного варианта (отсутствует, когда варианта нет). |
| `value` | Вычисленное значение (см. раздел **Вычисление `value`** ниже). |
| `metadata` | Метаданные флага: `flagId`, `description` и запись `tag:<value>: true` на каждый тег. |

### Коды причин

| `reason` | Что означает |
|----------|---------|
| `TARGETING_MATCH` | Совпал сегмент, у которого есть условия. |
| `SPLIT` | Совпал сегмент без условий, и вариант назначен распределением. |
| `STATIC` | Совпал сегмент **без условий** **и** у флага ровно один вариант — то есть безусловный, фиксированный результат. (Флаг с единственным вариантом, у совпавшего сегмента которого *есть* условия, вернёт `TARGETING_MATCH`.) |
| `DISABLED` | Флаг выключен. |
| `UNKNOWN` | Ни один сегмент не совпал. |

### Вычисление `value`

OpenFeature ожидает типизированное значение. Flagr вычисляет его из **вложения** варианта:

- Если во вложении есть поле `value`, возвращается именно оно (любой JSON-тип — строка, число, булево значение, объект).
- Иначе в качестве строкового значения возвращается **ключ варианта**.

Поэтому, чтобы отдавать типизированный флаг (например, число или булево значение) через OpenFeature, задайте варианту вложение вроде `{ "value": 42 }` или `{ "value": true }`. Для простого строкового флага достаточно ключа варианта.

## Оценка всех флагов (bulk)

`POST /ofrep/v1/evaluate/flags`

То же тело с контекстом; оценивает каждый **включённый** флаг и возвращает их под ключом `flags`:

```json
{
  "flags": [
    { "key": "checkout-redesign", "reason": "SPLIT", "variant": "control", "value": "control", "metadata": { "flagId": 42 } },
    { "key": "dark-mode", "reason": "DISABLED", "value": "off", "metadata": { "flagId": 43 } }
  ]
}
```

### Кэширование с ETag

Bulk-эндпоинт возвращает `ETag`, который меняется при любом изменении конфигурации флагов. Отправьте его обратно в `If-None-Match`, и Flagr ответит `304 Not Modified`, если ничего не изменилось — так OpenFeature-провайдер может дёшево опрашивать и перезапрашивать данные только при реальных изменениях.

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

## Ошибки

При сбоях используются коды ошибок OpenFeature. Ошибка по одному флагу включает `key`:

```json
{ "key": "checkout-redesign", "errorCode": "FLAG_NOT_FOUND" }
```

| `errorCode` | Когда |
|-------------|------|
| `PARSE_ERROR` | Тело запроса не является корректным JSON. |
| `INVALID_CONTEXT` | Объект `context` не передан. |
| `TARGETING_KEY_MISSING` | `context.targetingKey` отсутствует или пуст. |
| `FLAG_NOT_FOUND` | Неизвестный ключ флага (только при одиночной оценке). |

## OFREP vs. нативный API оценки

Оба оценивают одни и те же флаги одним и тем же движком. Используйте **OFREP**, когда хотите встроиться в экосистему OpenFeature и сохранить код вендоронезависимым; используйте [нативный API оценки](flagr_eval_api), когда нужен более богатый ответ Flagr (логи отладки, ID сегментов, ID снимков, массовая оценка по нескольким сущностям).
