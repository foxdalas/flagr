# Deployment & Operations

Flagr ships as a single self-contained binary (and Docker image) that serves the API and the web UI from one port (`18000`). This page covers the decisions that matter when you run it for real: where data lives, how to scale, and how to lock it down. Every setting referenced here has a row in [Server Config](flagr_env).

## Choosing a database

`FLAGR_DB_DBDRIVER` + `FLAGR_DB_DBCONNECTIONSTR` select the backing store:

| Driver | Use it for | Notes |
|---|---|---|
| `sqlite3` (default) | Local dev, single-node, demos | Writes to a **file** — single node only (see persistence below) |
| `mysql` | Production, multiple replicas | Shared DB enables horizontal scaling |
| `postgres` | Production, multiple replicas | Same as MySQL |
| `json_file` / `json_http` | Read-only **eval** nodes | Loads flags from a JSON snapshot; auto-enables `FLAGR_EVAL_ONLY_MODE` (no management API). See [JSON Flag Source](flagr_json_flag_spec) |

```bash
export FLAGR_DB_DBDRIVER=mysql
export FLAGR_DB_DBCONNECTIONSTR="user:pass@tcp(mysql:3306)/flagr?parseTime=true"
```

## Persistence & backup

!> **The default SQLite database lives inside the container and is lost when the container is replaced.** The published image even ships a *demo* database at `/data/demo_sqlite3.db`. If you run the stock image without changing this, you will silently lose your flags on the next deploy.

For anything beyond a throwaway demo:

- **SQLite** — point the connection string at a path on a **mounted volume** so the file survives restarts, and back that file up. SQLite is fine for a single node, but it cannot be shared across replicas.
- **MySQL / Postgres** — run a managed/replicated database and back it up like any other production datastore. This is the recommended path for production.

Either way, you can also snapshot all flag config any time via `GET /api/v1/export/sqlite` (see the [Management API](flagr_management_api)).

## Scaling horizontally

Flagr is **stateless** apart from the database, so you scale by running more replicas behind a load balancer — all pointing at the **same** MySQL/Postgres:

- Each replica keeps an **in-memory evaluation cache** and refreshes it from the DB every `FLAGR_EVALCACHE_REFRESHINTERVAL` (default **3s**). Evaluations are served entirely from this cache, so they're fast and don't hit the DB per request.
- The trade-off is **propagation delay**: a flag change made on one replica becomes visible on the others after up to one refresh interval (~3s). Plan for this in tests and rollouts.
- **SQLite cannot back multiple replicas** — its file is local to one node. Use MySQL/Postgres to scale out.

A common high-traffic topology: a small **management** deployment (full API, owns writes) plus a large pool of **eval-only** replicas (`FLAGR_EVAL_ONLY_MODE=true`, or a `json_http` driver) that only serve `/api/v1/evaluation*` and [OFREP](flagr_ofrep).

## Securing the instance

By default Flagr has **no authentication** — anyone who can reach it can read *and write* flags. Before exposing it, turn on one of the auth mechanisms (details and env vars in [Server Config](flagr_env)):

| Mechanism | Good for |
|---|---|
| **Basic auth** (`FLAGR_BASIC_AUTH_ENABLED`) | Simple shared-credential protection |
| **JWT** (`FLAGR_JWT_AUTH_ENABLED`) | Cookie- or header-based tokens from your SSO/proxy; supports `HS256`/`HS512`/`RS256` |
| **Header auth** (`FLAGR_HEADER_AUTH_ENABLED`) | Trusting an upstream proxy that injects an identity header |

!> Auth whitelists can leave evaluation (and sometimes `/api/v1/flags`) reachable for convenience. **Verify what your chosen whitelist exposes** — confirm that write endpoints actually require credentials, e.g. `curl` a `POST /api/v1/flags` without a token and check it's rejected.

**CORS:** the defaults are permissive — `FLAGR_CORS_ALLOWED_ORIGINS=*` with `FLAGR_CORS_ALLOW_CREDENTIALS=true`. Tighten `ALLOWED_ORIGINS` to your actual UI origin(s) in production.

**Profiling:** `pprof` is on by default at `/debug/pprof/` — don't leave it publicly reachable (see [Monitoring](flagr_monitoring)).

## Behind a reverse proxy

To serve Flagr under a sub-path (e.g. `https://tools.example.com/flagr`), set `FLAGR_WEB_PREFIX=/flagr`; Flagr strips the prefix and the UI builds its API URLs accordingly. At the proxy, forward the standard `X-Forwarded-*` headers and make sure your CORS origins match the public hostname.

## Kubernetes

Run the image as a normal stateless Deployment pointing at a shared MySQL/Postgres, and wire the [health endpoint](flagr_monitoring) into both probes:

```yaml
livenessProbe:
  httpGet: { path: /api/v1/health, port: 18000 }
readinessProbe:
  httpGet: { path: /api/v1/health, port: 18000 }
```

Scale with `replicas:` and keep the ~3s cache-propagation delay in mind. For an eval-only pool, set `FLAGR_EVAL_ONLY_MODE=true` (or use a `json_http` source) on those pods.

## Health & observability

`GET /api/v1/health` returns `200 {"status":"OK"}` once the server is up — use it for load-balancer and Kubernetes probes. For metrics, tracing, and alerting, see [Monitoring & Metrics](flagr_monitoring).
