# Primeros pasos

Flagr es un servicio de código abierto escrito en Go que entrega la experiencia adecuada a la entidad adecuada y monitorea su impacto. Ofrece feature flags, experimentación (pruebas A/B) y configuración dinámica. Cuenta con APIs REST claras y documentadas con swagger para la gestión de flags y la evaluación de flags. Para más detalles, consulta [Resumen de Flagr](flagr_overview)

## Ejecución

Ejecútalo directamente con docker.

```bash
# Start the docker container
docker pull ghcr.io/foxdalas/flagr
docker run -it -p 18000:18000 ghcr.io/foxdalas/flagr

# Open the Flagr UI
open localhost:18000
```

## Despliegue

Recomendamos usar directamente la imagen foxdalas/flagr y configurar todo mediante variables de entorno. Consulta más en [Configuración del servidor](flagr_env).

```bash
# Set env variables. For example,
export HOST=0.0.0.0
export PORT=18000
export FLAGR_DB_DBDRIVER=mysql
export FLAGR_DB_DBCONNECTIONSTR=root:@tcp(127.0.0.1:18100)/flagr?parseTime=true

# Run the docker image. Ideally, the deployment will be handled by Kubernetes or Mesos.
docker run -it -p 18000:18000 ghcr.io/foxdalas/flagr
```

## Desarrollo

Instala las dependencias.

- Go (1.26+)
- Make (para el Makefile)
- Node (20+) (para compilar la interfaz)

Compila desde el código fuente.

```bash
# get the source
git clone https://github.com/foxdalas/flagr.git
cd flagr

# install dependencies, generate code, and start the service in
# development mode
make build start
```

Si solo quieres ejecutar el backend precompilado (sin el servicio de desarrollo de la interfaz):

```
make run
```

Y, como alternativa, para ejecutar solo el servicio de la interfaz:

```
make run_ui
```

## Pruebas

Flagr tiene tres tipos de pruebas, cada una con un propósito distinto.

### Pruebas unitarias

Ejecuta las pruebas unitarias de Go (no requieren servicios externos):

```bash
make test
```

O directamente:

```bash
go test ./pkg/...
```

### Pruebas E2E (interfaz de Flagr)

Pruebas de extremo a extremo basadas en Playwright para la interfaz de Vue 3. Compila el servidor de Go, inicia los servidores del backend y de la interfaz, ejecuta Playwright y luego hace la limpieza:

```bash
make test-e2e
```

### Pruebas de integración (API, multi-BD)

Pruebas de integración a nivel HTTP que cubren todos los endpoints de CRUD y de evaluación. Carga ~50 flags realistas a través de los 12 operadores de restricción.

**Modo local** — SQLite `:memory:`, inicia automáticamente el servidor en un puerto aleatorio:

```bash
make test-integration
```

**Modo Docker Compose** — ejecuta el mismo conjunto de pruebas contra 6 instancias de flagr (SQLite, MySQL, MySQL 8, PostgreSQL 9, PostgreSQL 13, checkr/flagr):

```bash
cd integration_tests && make test
```

**Benchmarks de evaluación HTTP** — mide la latencia de evaluación de extremo a extremo a través de HTTP:

```bash
make bench-integration
```

Para ejecutar contra una sola instancia de Docker Compose:

```bash
cd integration_tests && make test-instance INSTANCE=flagr_with_mysql
```
