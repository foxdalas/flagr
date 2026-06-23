# JSON Flag Source

Flagr puede cargar los flags desde un archivo JSON en lugar de una base de datos. Esta es la base de los flujos de trabajo GitOps: gestiona tus flags como código, valídalos antes del despliegue y deja que Flagr los sirva.

## Inicio rápido

**Desde cero**: crea un archivo y apunta Flagr hacia él:

```json
{ "Flags": [] }
```

```sh
export FLAGR_DB_DBDRIVER=json_file
export FLAGR_DB_DBCONNECTIONSTR=/path/to/flags.json
./flagr
```

**Desde una instancia existente**: exporta, haz commit y despliega:

```sh
# Export from a running Flagr
curl http://localhost:18000/api/v1/export/eval_cache/json -o flags.json

# Edit, commit, push
git add flags.json && git commit -m "update flags"

# Deploy via local file or HTTP
export FLAGR_DB_DBDRIVER=json_file       # or json_http
export FLAGR_DB_DBCONNECTIONSTR=/path/to/flags.json
```

Flagr recarga los flags automáticamente en cada intervalo de refresco de la caché (por defecto: 3 segundos).

## Validación

Valida tu archivo de flags antes de desplegarlo:

```sh
go build -o flagr-validate ./cmd/flagr-validate/
./flagr-validate flags.json
```

El validador comprueba: que el JSON sea válido, los campos obligatorios, la unicidad de las claves, las sumas de las distribuciones (deben dar 100), las referencias a las variantes, las expresiones de las restricciones y los rangos de porcentaje. Informa por separado de los errores (que hay que corregir) y de las advertencias (que conviene corregir).

También puedes usar `ValidateFlags()` desde `pkg/handler` de forma programática.
## GitOps con GitHub

Aloja tu archivo `flags.json` en un repositorio Git y apunta Flagr al archivo en bruto. Esto te da GitOps completo: revisión por PR, registro de auditoría, rollback mediante `git revert` y validación en CI antes del despliegue.

### Configuración

1. **Crea un Personal Access Token de GitHub** (de tipo fine-grained, con alcance al repositorio):
   - Ve a **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
   - Limita su alcance al repositorio que contiene tu archivo de flags
   - Concede **Read access to Contents**

2. **Apunta Flagr al archivo en bruto** usando `json_http` con el token incrustado en la URL:

   ```sh
   export FLAGR_DB_DBDRIVER=json_http
   export FLAGR_DB_DBCONNECTIONSTR="https://<PAT>@raw.githubusercontent.com/<owner>/<repo>/<ref>/flags.json"
   ```

   El token se usa como nombre de usuario de la autenticación HTTP Basic (la contraseña queda vacía), algo que el paquete `net/http` de Go gestiona de forma transparente. GitHub lo acepta para el acceso a contenido en bruto.

   **Ejemplo**: cargar desde la rama `main` de un repositorio privado:

   ```sh
   export FLAGR_DB_DBCONNECTIONSTR="https://github_pat_xxxx@raw.githubusercontent.com/myorg/flagr-config/main/flags.json"
   ```

### Notas de seguridad

- Usa un **token fine-grained** con el alcance más reducido posible (un único repositorio, Contents en solo lectura).
- El token queda visible en el entorno y en el listado de procesos. En hosts compartidos, restringe el acceso al archivo de variables de entorno (por ejemplo, con `chmod 600`).
- Considera usar una cuenta de servicio dedicada para el token en lugar de una cuenta personal.
- Rota los tokens de forma periódica; los tokens fine-grained de GitHub admiten caducidad.

### Validación en CI

Valida tu archivo de flags en CI antes de que los merges lleguen a la rama que Flagr vigila:

```sh
go build -o flagr-validate ./cmd/flagr-validate/
./flagr-validate flags.json
```

Si la validación falla, se bloquea la PR: una configuración de flags rota nunca llega a tus instancias en marcha.

## Formato JSON

El objeto raíz contiene un único array `Flags`:

```json
{
  "Flags": [ ... ]
}
```

### Los IDs son opcionales

Todos los IDs de las entidades (flags, variantes, segmentos, restricciones, distribuciones, etiquetas) se **asignan automáticamente** si se omiten. Esto significa que los archivos editados a mano pueden prescindir por completo de los IDs. Si decides indicarlos, deben ser globalmente únicos por cada tipo de entidad.

Las distribuciones pueden referenciar variantes mediante `VariantKey` en lugar de `VariantID`: el sistema resuelve el vínculo automáticamente.

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

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|----------|-------------|
| `Key` | string | yes | Clave única para las peticiones de evaluación |
| `Description` | string | no | Descripción legible por humanos |
| `Enabled` | bool | no | Si el flag está activo |
| `Segments` | array | no | Segmentos de audiencia |
| `Variants` | array | no | Posibles resultados de la evaluación |
| `Tags` | array | no | Etiquetas para búsquedas |
| `Notes` | string | no | Notas en Markdown (admite KaTeX en la interfaz) |
| `DataRecordsEnabled` | bool | no | Registra los datos de evaluación en el pipeline de métricas |
| `EntityType` | string | no | Sobrescribe el tipo de entidad en los registros de evaluación |

### Variant

```json
{
  "Key": "control",
  "Attachment": { "color": "blue" }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|----------|-------------|
| `Key` | string | yes | Clave única dentro del flag |
| `Attachment` | object | no | Configuración JSON arbitraria para esta variante |

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

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|----------|-------------|
| `Description` | string | no | Descripción legible por humanos |
| `Rank` | uint | no | Prioridad de evaluación (menor = mayor prioridad). Por defecto: 999 |
| `RolloutPercent` | uint | no | Porcentaje de usuarios que coinciden con este segmento (0-100) |
| `Constraints` | array | no | Condiciones que deben cumplirse |
| `Distributions` | array | no | Cómo repartir los usuarios coincidentes entre las variantes |

### Constraint

```json
{
  "Property": "country",
  "Operator": "EQ",
  "Value": "\"US\""
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|----------|-------------|
| `Property` | string | yes | Propiedad de la entidad a evaluar (p. ej. `"country"`, `"age"`) |
| `Operator` | string | yes | Operador de comparación (ver más abajo) |
| `Value` | string | yes | Valor con el que comparar |

**Operadores:**

| Operator | Descripción | Example Value |
|----------|-------------|---------------|
| `EQ` | Igual | `"\"US\""` |
| `NEQ` | Distinto | `"\"US\""` |
| `LT` | Menor que | `"25"` |
| `LTE` | Menor o igual que | `"25"` |
| `GT` | Mayor que | `"18"` |
| `GTE` | Mayor o igual que | `"18"` |
| `EREG` | Coincide con regex | `"\"^US.*\""` |
| `NEREG` | No coincide con regex | `"\"^US.*\""` |
| `IN` | Valor en la lista | `"[\"US\", \"CA\", \"UK\"]"` |
| `NOTIN` | Valor fuera de la lista | `"[\"US\", \"CA\", \"UK\"]"` |
| `CONTAINS` | La cadena contiene | `"\"california\""` |
| `NOTCONTAINS` | La cadena no contiene | `"\"california\""` |

### Distribution

```json
{
  "VariantKey": "control",
  "Percent": 50
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|----------|-------------|
| `VariantKey` | string | yes* | Clave de la variante destino |
| `VariantID` | uint | yes* | ID de la variante destino (alternativa a VariantKey) |
| `Percent` | uint | yes | Porcentaje del tráfico del segmento (0-100). **Debe sumar 100 entre todas las distribuciones de un segmento.** |

*Se requiere `VariantKey` o `VariantID`.

### Tag

```json
{
  "Value": "frontend"
}
```

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|----------|-------------|
| `Value` | string | yes | Valor de la etiqueta |

## Ejemplo completo
Dos flags, sin IDs explícitos: el sistema se los asigna automáticamente al cargarlos.
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
