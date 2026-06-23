# API управления

Всё, что вы делаете в UI — создаёте флаг, добавляете варианты и сегменты, редактируете условия, задаёте распределение, включаете флаг — это REST-вызов, который можно сделать и напрямую. Это API для **автоматизации, CI/CD, скриптов и наполнения окружений**. (Чтобы *оценивать* флаги из вашего приложения, используйте [API оценки](flagr_eval_api).)

- **Базовый путь:** `/api/v1`
- **Тип содержимого:** `application/json`
- **Полная схема:** интерактивный [справочник API](api) (`/api_docs`) перечисляет каждый эндпоинт, поле и ответ — а эта страница служит практическим руководством.

!> API управления **не доступен** на [узлах только для оценки](flagr_eval_api) (`FLAGR_EVAL_ONLY_MODE=true`). Обращайтесь к нему через управляющий инстанс. Закройте управляющий инстанс [аутентификацией](flagr_deployment) — по умолчанию эти записывающие эндпоинты открыты.

## Иерархия ресурсов

Флагу принадлежит всё, что находится под ним:

```
flag
├── variants        (the possible return values)
├── tags            (labels for search & tag-based eval)
└── segments        (ordered targeting rules)
    ├── constraints (who is in the segment — combined with AND)
    └── distribution (how matched traffic splits across variants)
```

У каждого уровня есть свои эндпоинты, всегда вложенные в родительский флаг.

## Флаги

| Метод и путь | Назначение |
|---|---|
| `GET /flags` | Список флагов. Фильтры: `enabled`, `description`, `tags`, `key`, `deleted`, `preload`, `limit`, `offset` |
| `POST /flags` | Создать флаг (`description`, опционально `key`) |
| `GET /flags/{flagID}` | Получить один флаг со всеми его дочерними элементами |
| `PUT /flags/{flagID}` | Обновить `description`, `key`, `dataRecordsEnabled`, `entityType`, `notes` |
| `PUT /flags/{flagID}/enabled` | Включить/выключить флаг (`{"enabled": true}`) — аварийный выключатель |
| `DELETE /flags/{flagID}` | Мягко удалить флаг |
| `PUT /flags/{flagID}/restore` | Восстановить мягко удалённый флаг |
| `GET /flags/entity_types` | Список используемых типов сущностей |

```bash
# Create a flag, then read it back
curl -X POST http://localhost:18000/api/v1/flags \
  -H 'Content-Type: application/json' \
  -d '{"description": "New checkout flow", "key": "checkout-redesign"}'
# → { "id": 42, "key": "checkout-redesign", ... }
```

!> Создание флага **не** включает его. Новый флаг выключен и не возвращает ни одного варианта, пока вы не добавите варианты/сегменты/распределение и не вызовете `.../enabled`.

## Варианты

| Метод и путь | Назначение |
|---|---|
| `GET /flags/{flagID}/variants` | Список вариантов |
| `POST /flags/{flagID}/variants` | Создать вариант (`key`, опционально `attachment`) |
| `PUT /flags/{flagID}/variants/{variantID}` | Обновить ключ / вложение |
| `DELETE /flags/{flagID}/variants/{variantID}` | Удалить вариант |

```bash
curl -X POST http://localhost:18000/api/v1/flags/42/variants \
  -H 'Content-Type: application/json' \
  -d '{"key": "treatment", "attachment": {"color": "#22c55e"}}'
```

`attachment` — это произвольный JSON, возвращаемый вместе с вариантом во время оценки — см. [динамическую конфигурацию](flagr_use_cases).

## Сегменты

Сегменты оцениваются **по порядку**; побеждает первый, чьи условия совпали (см. [Как работает оценка](flagr_evaluation)).

| Метод и путь | Назначение |
|---|---|
| `GET /flags/{flagID}/segments` | Список сегментов в порядке оценки |
| `POST /flags/{flagID}/segments` | Создать сегмент (`description`, `rolloutPercent`) |
| `PUT /flags/{flagID}/segments/{segmentID}` | Обновить описание / охват |
| `DELETE /flags/{flagID}/segments/{segmentID}` | Удалить сегмент (вместе с его условиями/распределением) |
| `PUT /flags/{flagID}/segments/reorder` | Изменить порядок по ID: `{"segmentIDs": [3, 1, 2]}` |

## Условия

Условия определяют, *кто* входит в сегмент; все условия сегмента объединяются по `AND`. Правила операторов и значений см. в [Операторах условий](flagr_operators).

| Метод и путь | Назначение |
|---|---|
| `GET /flags/{flagID}/segments/{segmentID}/constraints` | Список условий |
| `POST /flags/{flagID}/segments/{segmentID}/constraints` | Добавить условие (`property`, `operator`, `value`) |
| `PUT /…/constraints/{constraintID}` | Обновить условие |
| `DELETE /…/constraints/{constraintID}` | Удалить условие |

```bash
curl -X POST http://localhost:18000/api/v1/flags/42/segments/100/constraints \
  -H 'Content-Type: application/json' \
  -d '{"property": "country", "operator": "EQ", "value": "\"US\""}'
```

!> Строковые значения нужно брать в кавычки *внутри* JSON-строки — `"value": "\"US\""`, а не `"value": "US"`. Значение без кавычек воспринимается как переменная и не совпадёт никогда. [Справочник операторов](flagr_operators).

## Распределение

У сегмента **одно** распределение; вы заменяете его целиком. Сумма процентов должна равняться **100**.

| Метод и путь | Назначение |
|---|---|
| `GET /flags/{flagID}/segments/{segmentID}/distributions` | Прочитать текущее распределение |
| `PUT /flags/{flagID}/segments/{segmentID}/distributions` | Заменить его |

```bash
curl -X PUT http://localhost:18000/api/v1/flags/42/segments/100/distributions \
  -H 'Content-Type: application/json' \
  -d '{"distributions": [
        {"variantID": 200, "variantKey": "control",   "percent": 50},
        {"variantID": 201, "variantKey": "treatment", "percent": 50}
      ]}'
```

## Теги

| Метод и путь | Назначение |
|---|---|
| `GET /flags/{flagID}/tags` | Список тегов флага |
| `POST /flags/{flagID}/tags` | Добавить тег (`value`) |
| `DELETE /flags/{flagID}/tags/{tagID}` | Удалить тег |
| `GET /tags` | Список всех тегов по всем флагам |

Теги задействованы в [пакетной оценке по тегам](flagr_eval_api) и в поиске.

## История и обнаружение изменений

| Метод и путь | Назначение |
|---|---|
| `GET /flags/{flagID}/snapshots` | История ревизий флага (каждое изменение конфигурации, кто/когда) — данные, стоящие за вкладкой «История» в UI |
| `GET /flags/snapshots/max_id` | Единый монотонно растущий счётчик по *всей* конфигурации флагов. Опрашивайте его, чтобы дёшево понять «изменилось ли что-нибудь?» без сравнения данных |

`max_id` — это лёгкая альтернатива `ETag` из API оценки: если число не сдвинулось, конфигурация флагов не менялась.

## Экспорт

| Метод и путь | Назначение |
|---|---|
| `GET /export/sqlite` | Скачать всю базу данных флагов как файл SQLite |
| `GET /export/eval_cache/json` | Экспортировать кэш оценки из памяти в JSON |

`export/eval_cache/json` принимает фильтры — `ids`, `keys`, `enabled`, `tags` или `all` — и выдаёт ровно тот формат [JSON-источника флагов](flagr_json_flag_spec). Распространённый сценарий — **экспорт из управляющего инстанса → раздача его на узлы только для оценки** через драйвер `json_file` / `json_http`:

```bash
curl 'http://localhost:18000/api/v1/export/eval_cache/json?enabled=true' > flags.json
```

## Полный флаг от начала до конца

```bash
BASE=http://localhost:18000/api/v1
# 1. create the flag
FID=$(curl -s -X POST $BASE/flags -d '{"key":"checkout-redesign","description":"New checkout"}' | jq .id)
# 2. variants
curl -s -X POST $BASE/flags/$FID/variants -d '{"key":"control"}'
curl -s -X POST $BASE/flags/$FID/variants -d '{"key":"treatment"}'
# 3. a segment at 100% rollout
SID=$(curl -s -X POST $BASE/flags/$FID/segments -d '{"description":"all","rolloutPercent":100}' | jq .id)
# 4. a 50/50 distribution (use the variant IDs returned above)
curl -s -X PUT $BASE/flags/$FID/segments/$SID/distributions -d '{"distributions":[...]}'
# 5. turn it on
curl -s -X PUT $BASE/flags/$FID/enabled -d '{"enabled":true}'
```

После любой записи дайте кэшу оценки обновиться один раз ([eval-cache refresh](flagr_env), ~3 с), прежде чем изменения отразятся в оценках.
