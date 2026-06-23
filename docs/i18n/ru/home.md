# Начало работы

Flagr — это сервис на Go с открытым исходным кодом: он показывает каждой сущности нужный вариант и отслеживает эффект. Flagr закрывает три задачи — фича-флаги, эксперименты (A/B-тесты) и динамическую конфигурацию. Управлять флагами и оценивать их можно через понятный REST API с описанием в Swagger. Подробнее — в [обзоре Flagr](flagr_overview).

## Запуск

Проще всего запустить через Docker.

```bash
# Запускаем контейнер
docker pull ghcr.io/foxdalas/flagr
docker run -it -p 18000:18000 ghcr.io/foxdalas/flagr

# Открываем интерфейс Flagr
open localhost:18000
```

## Развёртывание

Рекомендуем брать готовый образ foxdalas/flagr и настраивать всё через переменные окружения. Подробнее — в разделе [Настройки сервера](flagr_env).

```bash
# Задаём переменные окружения. Например:
export HOST=0.0.0.0
export PORT=18000
export FLAGR_DB_DBDRIVER=mysql
export FLAGR_DB_DBCONNECTIONSTR=root:@tcp(127.0.0.1:18100)/flagr?parseTime=true

# Запускаем образ. В идеале развёртыванием занимается Kubernetes или Mesos.
docker run -it -p 18000:18000 ghcr.io/foxdalas/flagr
```

## Разработка

Установите зависимости:

- Go (1.26+)
- Make (для Makefile)
- Node (20+) (для сборки интерфейса)

Соберите из исходного кода:

```bash
# получаем исходники
git clone https://github.com/foxdalas/flagr.git
cd flagr

# ставим зависимости, генерируем код и запускаем сервис
# в режиме разработки
make build start
```

Если нужно просто запустить готовый бэкенд (без dev-сервера интерфейса):

```
make run
```

А чтобы поднять только интерфейс:

```
make run_ui
```

## Тестирование

В Flagr три вида тестов, каждый решает свою задачу.

### Модульные тесты

Запуск модульных тестов на Go (внешние сервисы не нужны):

```bash
make test
```

Или напрямую:

```bash
go test ./pkg/...
```

### E2E-тесты (интерфейс Flagr)

End-to-end тесты на Playwright для интерфейса на Vue 3. Команда собирает Go-сервер, поднимает бэкенд и интерфейс, прогоняет Playwright и убирает за собой:

```bash
make test-e2e
```

### Интеграционные тесты (API, несколько БД)

Интеграционные тесты на уровне HTTP — покрывают все CRUD- и eval-эндпоинты. Наполняют базу примерно 50 реалистичными флагами, которые задействуют все 12 операторов условий.

**Локальный режим** — SQLite `:memory:`, сервер поднимается сам на случайном порту:

```bash
make test-integration
```

**Режим Docker Compose** — тот же набор тестов прогоняется на 6 экземплярах flagr (SQLite, MySQL, MySQL 8, PostgreSQL 9, PostgreSQL 13,
checkr/flagr):

```bash
cd integration_tests && make test
```

**HTTP-бенчмарки оценки** — измеряют сквозную задержку оценки по HTTP:

```bash
make bench-integration
```

Запуск на одном экземпляре Docker Compose:

```bash
cd integration_tests && make test-instance INSTANCE=flagr_with_mysql
```
