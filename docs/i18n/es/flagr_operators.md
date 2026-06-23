# Operadores de restricciones

Un **segmento** apunta a una audiencia mediante una lista de **restricciones**. Cada restricción es una regla con la forma:

```
<property>  <operator>  <value>
```

Todas las restricciones de un segmento se combinan con `AND` — una entidad coincide con el segmento solo si **todas** las restricciones coinciden. Un segmento sin restricciones coincide con todo el mundo.

Las restricciones se comprueban contra el `entityContext` de la entidad — el mapa clave/valor que envías con la [petición de evaluación](flagr_eval_api). `property` es la clave de contexto que se lee; `value` es aquello con lo que se compara.

## Los 12 operadores

| Operador | Símbolo | Coincide cuando… | Formato del valor | Ejemplo |
|----------|--------|---------------|--------------|---------|
| `EQ` | `==` | la propiedad es igual al valor | cadena entre comillas / número / booleano | `"CA"`, `42`, `true` |
| `NEQ` | `!=` | la propiedad no es igual al valor | cadena entre comillas / número / booleano | `"CA"` |
| `LT` | `<` | la propiedad es menor que el valor | número | `18` |
| `LTE` | `<=` | la propiedad es ≤ que el valor | número | `18` |
| `GT` | `>` | la propiedad es mayor que el valor | número | `21` |
| `GTE` | `>=` | la propiedad es ≥ que el valor | número | `21` |
| `EREG` | `=~` | la propiedad coincide con la regex | regex entre comillas | `"^(CA\|NY)$"` |
| `NEREG` | `!~` | la propiedad no coincide con la regex | regex entre comillas | `"^test"` |
| `IN` | `IN` | la propiedad es uno de los valores | array JSON | `["CA", "NY"]` |
| `NOTIN` | `NOT IN` | la propiedad no está en la lista | array JSON | `["CA", "NY"]` |
| `CONTAINS` | `CONTAINS` | la propiedad de tipo cadena contiene la subcadena | cadena entre comillas | `"premium"` |
| `NOTCONTAINS` | `NOT CONTAINS` | la propiedad de tipo cadena no contiene la subcadena | cadena entre comillas | `"premium"` |

## Reglas de comillas (lee esto primero)

Este es, con diferencia, el error más habitual. Flagr interpreta el valor como una **expresión**, así que su tipo importa:

- **Las cadenas deben ir entre comillas dobles** — `"CA"`, no `CA`. Una palabra sin comillas como `CA` se interpreta como el *nombre de una variable*, no como un literal, así que silenciosamente nunca coincide.
- **Los números van sin comillas** — `18`, no `"18"`. Un número entre comillas es una cadena y no se compara con `<`, `>`, `>=`, etc.
- **Los booleanos van sin comillas** — `true` / `false`.
- **`IN` / `NOTIN` toman un array JSON** — `["CA", "NY", "TX"]`.
- **`EREG` / `NEREG` toman una regex entre comillas** — `"^US.*"`.

!> Pon entre comillas tus valores de tipo cadena. `state == "CA"` coincide; `state == CA` interpreta `CA` como una variable y no coincide con nada — sin dar ningún error. Tanto el editor de restricciones de la UI como la herramienta `flagr-validate` lo señalan, pero conviene grabárselo a fuego en la memoria.

### Forma del formulario de la UI vs. forma del archivo JSON

El valor siempre se almacena como una cadena. Cómo lo escribes depende de dónde:

- En la **UI** escribes el valor tal cual: `"CA"`, `21`, `["US","CA"]`.
- En un **archivo JSON de flag** el valor es a su vez una cadena JSON, así que las comillas internas van escapadas: `"\"CA\""`, `"21"`, `"[\"US\",\"CA\"]"`. Consulta [Fuente JSON de flags](flagr_json_flag_spec).

## Propiedades y contexto de la entidad

`property` es una clave del `entityContext` de la petición de evaluación. Por ejemplo, esta petición:

```json
{ "entityID": "u123", "entityContext": { "state": "CA", "age": 31 } }
```

coincide con un segmento que tenga estas restricciones:

| Propiedad | Operador | Valor |
|----------|----------|-------|
| `state` | `EQ` | `"CA"` |
| `age` | `GTE` | `21` |

Los nombres de propiedad pueden contener puntos, guiones y otros caracteres — Flagr los envuelve internamente, así que `country.code` o `user-tier` funcionan como claves de propiedad.

## Ejemplos

**Lista blanca de países** — `country IN ["US","CA","GB"]`:

| Propiedad | Operador | Valor |
|----------|----------|-------|
| `country` | `IN` | `["US", "CA", "GB"]` |

**Umbral numérico** — `age >= 21`:

| Propiedad | Operador | Valor |
|----------|----------|-------|
| `age` | `GTE` | `21` |

**Dominio de email mediante regex** — `email =~ "@example\.com$"`:

| Propiedad | Operador | Valor |
|----------|----------|-------|
| `email` | `EREG` | `"@example\\.com$"` |

## Notas sobre regex

`EREG` / `NEREG` usan la sintaxis del paquete `regexp` de Go (RE2). Pasa el patrón como una **cadena entre comillas**: `"^v[0-9]+"`.

- Los escapes con barra invertida funcionan dentro de las comillas — `"\\d+"` para dígitos, `"\\."` para un punto literal.
- Los patrones solo quedan anclados donde tú los anclas — usa `^` y `$` para que coincida con la cadena completa (`"^(CA|NY)$"`); de lo contrario coincide en cualquier parte del valor.
- **Un `/` literal en el patrón es el único punto delicado.** Normalmente Flagr envuelve tu patrón en forma de literal de regex (`/…/`) internamente, que es justo lo que permite que escapes con barra invertida como `"\\d+"` y `"\\."` pasen de forma fiable. Un patrón que *en sí mismo* contiene `/` se salta ese envoltorio y se interpreta como una cadena entre comillas corriente, donde los escapes los gestiona el analizador de expresiones y pueden comportarse de forma distinta. Si necesitas que coincida una barra, verifica la restricción en la **Consola de depuración** (o con `flagr-validate`) antes de confiar en ella.

## Validar restricciones

- En la **UI**, el editor de restricciones muestra una pista en línea cuando un valor parece incorrecto (una cadena sin comillas, un valor no numérico para `<`, un array JSON mal formado o una regex inválida) y mantiene el botón Save deshabilitado hasta que se corrige.
- Para los flags con **fuente JSON**, ejecuta `flagr-validate` (consulta [Fuente JSON de flags](flagr_json_flag_spec)) — comprueba cada expresión de restricción antes del despliegue.

Consulta también: [Cómo funciona la evaluación](flagr_evaluation) para ver cómo un segmento que coincide se convierte en una variante.
