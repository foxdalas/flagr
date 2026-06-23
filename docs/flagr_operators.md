# Constraint Operators

A **segment** targets an audience with a list of **constraints**. Each constraint is one rule of the form:

```
<property>  <operator>  <value>
```

All constraints in a segment are combined with `AND` — an entity matches the segment only if **every** constraint matches. A segment with no constraints matches everyone.

Constraints are checked against the entity's `entityContext` — the key/value map you send with the [evaluation request](flagr_eval_api). `property` is the context key to read; `value` is what to compare it against.

## The 12 operators

| Operator | Symbol | Matches when… | Value format | Example |
|----------|--------|---------------|--------------|---------|
| `EQ` | `==` | property equals value | quoted string / number / bool | `"CA"`, `42`, `true` |
| `NEQ` | `!=` | property does not equal value | quoted string / number / bool | `"CA"` |
| `LT` | `<` | property is less than value | number | `18` |
| `LTE` | `<=` | property is ≤ value | number | `18` |
| `GT` | `>` | property is greater than value | number | `21` |
| `GTE` | `>=` | property is ≥ value | number | `21` |
| `EREG` | `=~` | property matches the regex | quoted regex | `"^(CA\|NY)$"` |
| `NEREG` | `!~` | property does not match the regex | quoted regex | `"^test"` |
| `IN` | `IN` | property is one of the values | JSON array | `["CA", "NY"]` |
| `NOTIN` | `NOT IN` | property is not in the list | JSON array | `["CA", "NY"]` |
| `CONTAINS` | `CONTAINS` | string property contains the substring | quoted string | `"premium"` |
| `NOTCONTAINS` | `NOT CONTAINS` | string property does not contain the substring | quoted string | `"premium"` |

## Quoting rules (read this first)

This is the single most common mistake. Flagr parses the value as an **expression**, so its type matters:

- **Strings must be wrapped in double quotes** — `"CA"`, not `CA`. An unquoted word like `CA` is parsed as a *variable name*, not a literal, so it silently never matches.
- **Numbers are bare** — `18`, not `"18"`. A quoted number is a string and won't compare with `<`, `>`, `>=`, etc.
- **Booleans are bare** — `true` / `false`.
- **`IN` / `NOTIN` take a JSON array** — `["CA", "NY", "TX"]`.
- **`EREG` / `NEREG` take a quoted regex** — `"^US.*"`.

!> Quote your string values. `state == "CA"` matches; `state == CA` parses `CA` as a variable and matches nothing — with no error. The constraint editor in the UI and the `flagr-validate` tool both flag this, but it's worth burning into memory.

### UI form vs. JSON-file form

The value is always stored as a string. How you write it depends on where:

- In the **UI** you type the value as-is: `"CA"`, `21`, `["US","CA"]`.
- In a **JSON flag file** the value is itself a JSON string, so the inner quotes are escaped: `"\"CA\""`, `"21"`, `"[\"US\",\"CA\"]"`. See [JSON Flag Source](flagr_json_flag_spec).

## Properties and entity context

`property` is a key in the evaluation request's `entityContext`. For example, this request:

```json
{ "entityID": "u123", "entityContext": { "state": "CA", "age": 31 } }
```

is matched by a segment with these constraints:

| Property | Operator | Value |
|----------|----------|-------|
| `state` | `EQ` | `"CA"` |
| `age` | `GTE` | `21` |

Property names may contain dots, hyphens, and other characters — Flagr wraps them internally, so `country.code` or `user-tier` work as property keys.

## Examples

**Allow-list of countries** — `country IN ["US","CA","GB"]`:

| Property | Operator | Value |
|----------|----------|-------|
| `country` | `IN` | `["US", "CA", "GB"]` |

**Numeric threshold** — `age >= 21`:

| Property | Operator | Value |
|----------|----------|-------|
| `age` | `GTE` | `21` |

**Email domain via regex** — `email =~ "@example\.com$"`:

| Property | Operator | Value |
|----------|----------|-------|
| `email` | `EREG` | `"@example\\.com$"` |

## Regex notes

`EREG` / `NEREG` use Go's `regexp` (RE2) syntax. Pass the pattern as a **quoted string**: `"^v[0-9]+"`.

- Backslash escapes work inside the quotes — `"\\d+"` for digits, `"\\."` for a literal dot.
- Patterns are anchored only where you anchor them — use `^` and `$` for a full-string match (`"^(CA|NY)$"`), otherwise it matches anywhere in the value.
- **A literal `/` in the pattern is the one rough edge.** Flagr normally wraps your pattern in regex-literal form (`/…/`) internally, which is exactly what lets backslash escapes like `"\\d+"` and `"\\."` pass through reliably. A pattern that *itself* contains `/` skips that wrapping and is parsed as an ordinary quoted string, where escapes are handled by the expression parser instead and may behave differently. If you need to match a slash, verify the constraint in the **Debug Console** (or with `flagr-validate`) before relying on it.

## Validating constraints

- In the **UI**, the constraint editor shows an inline hint when a value looks wrong (an unquoted string, a non-numeric value for `<`, a malformed JSON array, or an invalid regex) and keeps the Save button disabled until it's fixed.
- For **JSON-sourced** flags, run `flagr-validate` (see [JSON Flag Source](flagr_json_flag_spec)) — it checks every constraint expression before deploy.

See also: [How Evaluation Works](flagr_evaluation) for how a matched segment turns into a variant.
