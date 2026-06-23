# JSON Flag Source

Flagr умеет загружать флаги из JSON-файла вместо базы данных. Это основа для GitOps-подхода: храните флаги как код, проверяйте их перед развёртыванием и отдавайте через Flagr.

## Быстрый старт

**С нуля** — создайте файл и укажите его Flagr:

```json
{ "Flags": [] }
```

```sh
export FLAGR_DB_DBDRIVER=json_file
export FLAGR_DB_DBCONNECTIONSTR=/path/to/flags.json
./flagr
```

**Из существующего инстанса** — экспортируйте, закоммитьте, разверните:

```sh
# Export from a running Flagr
curl http://localhost:18000/api/v1/export/eval_cache/json -o flags.json

# Edit, commit, push
git add flags.json && git commit -m "update flags"

# Deploy via local file or HTTP
export FLAGR_DB_DBDRIVER=json_file       # or json_http
export FLAGR_DB_DBCONNECTIONSTR=/path/to/flags.json
```

Flagr автоматически перезагружает флаги с периодом обновления кэша (по умолчанию — 3 секунды).

## Проверка

Проверьте файл с флагами перед развёртыванием:

```sh
go build -o flagr-validate ./cmd/flagr-validate/
./flagr-validate flags.json
```

Валидатор проверяет: корректность JSON, наличие обязательных полей, уникальность ключей, суммы распределений (должны давать 100), ссылки на варианты, выражения в условиях и диапазоны процентов. Ошибки (которые обязательно нужно исправить) и предупреждения (которые желательно исправить) он показывает отдельно.

Можно также вызвать `ValidateFlags()` из `pkg/handler` программно.
## GitOps с GitHub

Разместите `flags.json` в Git-репозитории и укажите Flagr на «сырой» файл. Так вы получаете полноценный GitOps: ревью в PR, журнал изменений, откат через `git revert` и проверку в CI перед развёртыванием.

### Настройка

1. **Создайте Personal Access Token в GitHub** (fine-grained, с доступом к нужному репозиторию):
   - Откройте **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
   - Ограничьте область репозиторием, в котором лежит файл с флагами
   - Выдайте **Read access to Contents**

2. **Укажите Flagr на «сырой» файл** через `json_http`, встроив токен в URL:

   ```sh
   export FLAGR_DB_DBDRIVER=json_http
   export FLAGR_DB_DBCONNECTIONSTR="https://<PAT>@raw.githubusercontent.com/<owner>/<repo>/<ref>/flags.json"
   ```

   Токен подставляется как имя пользователя в HTTP Basic Auth (пароль при этом пустой), и Go-шный `net/http` обрабатывает это прозрачно. GitHub принимает такой формат для доступа к «сырому» содержимому.

   **Пример** — загрузка из ветки `main` приватного репозитория:

   ```sh
   export FLAGR_DB_DBCONNECTIONSTR="https://github_pat_xxxx@raw.githubusercontent.com/myorg/flagr-config/main/flags.json"
   ```

### О безопасности

- Используйте **fine-grained токен** с минимально возможной областью доступа (один репозиторий, только чтение Contents).
- Токен виден в окружении и в списке процессов. На общих хостах ограничьте доступ к файлу с переменными окружения (например, `chmod 600`).
- Лучше завести под токен отдельный сервисный аккаунт, а не личный.
- Регулярно ротируйте токены; fine-grained токены GitHub поддерживают срок действия.

### Проверка в CI

Проверяйте файл с флагами в CI до того, как изменения попадут в ветку, за которой следит Flagr:

```sh
go build -o flagr-validate ./cmd/flagr-validate/
./flagr-validate flags.json
```

Непройденная проверка блокирует PR — сломанная конфигурация флагов никогда не доберётся до работающих инстансов.

## Формат JSON

В корневом объекте лежит единственный массив `Flags`:

```json
{
  "Flags": [ ... ]
}
```

### ID необязательны

Все ID сущностей (флагов, вариантов, сегментов, условий, распределений, тегов) **назначаются автоматически**, если их не указать. Это значит, что в файлах, которые редактируются вручную, ID можно вообще пропустить. Если вы их всё-таки задаёте, они должны быть глобально уникальны в пределах своего типа сущности.

Распределения могут ссылаться на варианты через `VariantKey` вместо `VariantID` — система сама свяжет их.

### Flag

```json
{
  "Key": "my-feature",
  "Description": "Controls the new dashboard rollout",
  "Enabled": true,
  "Segments": [ ... ],
  "Variants": [ ... ],
  "Tags": [ ... ],
  "Notes": "Optional markdown notes",
  "DataRecordsEnabled": true,
  "EntityType": "user"
}
```

| Поле | Тип | Обязательное | Описание |
|-------|------|----------|-------------|
| `Key` | string | yes | Уникальный ключ для запросов оценки |
| `Description` | string | no | Человекочитаемое описание |
| `Enabled` | bool | no | Активен ли флаг |
| `Segments` | array | no | Сегменты аудитории |
| `Variants` | array | no | Возможные исходы оценки |
| `Tags` | array | no | Теги для поиска |
| `Notes` | string | no | Заметки в Markdown (в UI поддерживается KaTeX) |
| `DataRecordsEnabled` | bool | no | Писать данные оценки в конвейер метрик |
| `EntityType` | string | no | Переопределяет тип сущности в логах оценки |

### Variant

```json
{
  "Key": "control",
  "Attachment": { "color": "blue" }
}
```

| Поле | Тип | Обязательное | Описание |
|-------|------|----------|-------------|
| `Key` | string | yes | Уникальный ключ в пределах флага |
| `Attachment` | object | no | Произвольная JSON-конфигурация для этого варианта |

### Segment

```json
{
  "Description": "All US users",
  "Rank": 0,
  "RolloutPercent": 100,
  "Constraints": [ ... ],
  "Distributions": [ ... ]
}
```

| Поле | Тип | Обязательное | Описание |
|-------|------|----------|-------------|
| `Description` | string | no | Человекочитаемое описание |
| `Rank` | uint | no | Приоритет оценки (меньше = выше приоритет). По умолчанию: 999 |
| `RolloutPercent` | uint | no | Доля пользователей, подходящих под этот сегмент (0-100) |
| `Constraints` | array | no | Условия, которые должны совпасть |
| `Distributions` | array | no | Как распределить подходящих пользователей по вариантам |

### Constraint

```json
{
  "Property": "country",
  "Operator": "EQ",
  "Value": "\"US\""
}
```

| Поле | Тип | Обязательное | Описание |
|-------|------|----------|-------------|
| `Property` | string | yes | Свойство сущности для оценки (например, `"country"`, `"age"`) |
| `Operator` | string | yes | Оператор сравнения (см. ниже) |
| `Value` | string | yes | Значение, с которым сравнивать |

**Операторы:**

| Operator | Описание | Example Value |
|----------|-------------|---------------|
| `EQ` | Равно | `"\"US\""` |
| `NEQ` | Не равно | `"\"US\""` |
| `LT` | Меньше | `"25"` |
| `LTE` | Меньше или равно | `"25"` |
| `GT` | Больше | `"18"` |
| `GTE` | Больше или равно | `"18"` |
| `EREG` | Совпадение по регулярному выражению | `"\"^US.*\""` |
| `NEREG` | Несовпадение по регулярному выражению | `"\"^US.*\""` |
| `IN` | Значение есть в списке | `"[\"US\", \"CA\", \"UK\"]"` |
| `NOTIN` | Значения нет в списке | `"[\"US\", \"CA\", \"UK\"]"` |
| `CONTAINS` | Строка содержит | `"\"california\""` |
| `NOTCONTAINS` | Строка не содержит | `"\"california\""` |

### Distribution

```json
{
  "VariantKey": "control",
  "Percent": 50
}
```

| Поле | Тип | Обязательное | Описание |
|-------|------|----------|-------------|
| `VariantKey` | string | yes* | Ключ целевого варианта |
| `VariantID` | uint | yes* | ID целевого варианта (альтернатива VariantKey) |
| `Percent` | uint | yes | Доля трафика сегмента (0-100). **Сумма по всем распределениям в сегменте должна быть равна 100.** |

*Обязательно либо `VariantKey`, либо `VariantID`.

### Tag

```json
{
  "Value": "frontend"
}
```

| Поле | Тип | Обязательное | Описание |
|-------|------|----------|-------------|
| `Value` | string | yes | Значение тега |

## Полный пример
Два флага без явных ID — система назначает их автоматически при загрузке.
```json
{
  "Flags": [
    {
      "Key": "new-dashboard",
      "Description": "Controls the new dashboard rollout",
      "Enabled": true,
      "EntityType": "user",
      "DataRecordsEnabled": false,
      "Notes": "Rolling out new dashboard to 50% of users",
      "Tags": [
        { "Value": "frontend" },
        { "Value": "experiment" }
      ],
      "Variants": [
        {
          "Key": "control",
          "Attachment": { "color": "blue", "layout": "classic" }
        },
        {
          "Key": "treatment",
          "Attachment": { "color": "green", "layout": "modern" }
        }
      ],
      "Segments": [
        {
          "Description": "All users",
          "Rank": 0,
          "RolloutPercent": 100,
          "Constraints": [],
          "Distributions": [
            { "VariantKey": "control", "Percent": 50 },
            { "VariantKey": "treatment", "Percent": 50 }
          ]
        }
      ]
    },
    {
      "Key": "maintenance-mode",
      "Description": "Enables maintenance mode for the API",
      "Enabled": false,
      "EntityType": "request",
      "DataRecordsEnabled": true,
      "Tags": [
        { "Value": "ops" }
      ],
      "Variants": [
        { "Key": "off", "Attachment": {} },
        {
          "Key": "on",
          "Attachment": { "message": "System maintenance in progress", "retryAfter": 300 }
        }
      ],
      "Segments": [
        {
          "Description": "Beta users get maintenance mode early",
          "Rank": 0,
          "RolloutPercent": 100,
          "Constraints": [
            { "Property": "tier", "Operator": "EQ", "Value": "\"beta\"" }
          ],
          "Distributions": [
            { "VariantKey": "on", "Percent": 100 }
          ]
        },
        {
          "Description": "All other users",
          "Rank": 1,
          "RolloutPercent": 100,
          "Constraints": [],
          "Distributions": [
            { "VariantKey": "off", "Percent": 100 }
          ]
        }
      ]
    }
  ]
}
```
