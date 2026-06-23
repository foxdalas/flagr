# Segmentos y segmentación

Un **segmento** es una regla de segmentación: *a quién* se le aplica un flag y *a qué proporción* de ellos. Un flag se evalúa contra sus segmentos de arriba abajo, y **gana el primer segmento que coincide**. Dentro de un segmento que coincide, la [distribución](flagr_ui_distribution) decide qué variante recibe la entidad.

La sección de segmentos está en la pestaña **Configuración** del flag.

![Un segmento con restricciones y una distribución](images/es/segments.png)

## Crear un segmento

Haz clic en **Nuevo segmento**. En el diálogo, asígnale una **descripción** y una **Cobertura %** (su valor por defecto es **50%**, no 0 — así que un segmento recién creado incluye a la mitad de las entidades coincidentes hasta que lo cambies), y luego pulsa **Crear segmento**. Se añade al final de la lista.

## El orden importa — gana la primera coincidencia

Los segmentos se evalúan en orden, y la evaluación se detiene en el primero que coincide. Pon tus segmentos **más específicos** primero; un segmento amplio por encima de uno más concreto significa que ese segmento concreto nunca se alcanza.

- Las insignias `[1]`, `[2]`, … muestran el orden de evaluación.
- Arrastra el tirador (⠿) para reordenar, o usa los botones **▲ / ▼**.
- Reordenar se guarda al instante (`Segmento reordenado`).
- La pista *«Se evalúan de arriba abajo — gana la primera coincidencia»* aparece encima de la lista como recordatorio.

## Campos del segmento

- **Descripción** — una etiqueta legible.
- **Cobertura %** — la proporción de entidades *que coinciden* que realmente se incluyen (0–100). La cobertura es determinista por entidad, así que una cobertura del 20% siempre incluye al mismo 20%. Es una **puerta**: dentro o fuera. Consulta [cobertura frente a distribución](flagr_ui_distribution).

Haz clic en **Guardar segmento** después de editar. El icono de la papelera elimina el segmento (y sus restricciones y distribuciones) tras una confirmación.

## Restricciones

Las **restricciones** definen *quién* está en el segmento. Aparecen bajo **Restricciones (deben cumplirse TODAS)** — todas las restricciones deben cumplirse (`AND`). Un segmento **sin restricciones coincide con todo el mundo**.

Cada restricción tiene tres partes:

- **Propiedad** — la clave del contexto de la entidad que se va a comprobar (p. ej. `state`, `age`).
- **Operador** — cómo comparar (`==`, `IN`, `>=`, regex, …).
- **Valor** — con qué comparar.

Añade una con la fila del final (**Añadir restricción**); edita y pulsa **Guardar** o elimina cada una de las existentes. El desplegable de operadores muestra una breve descripción de cada operador.

!> Pon los valores de texto entre comillas — `"CA"`, no `CA`. El editor muestra una pista en línea cuando un valor parece incorrecto (una cadena sin comillas, un valor no numérico para `<`, una lista mal formada, una regex inválida) y mantiene **Guardar** desactivado hasta que se corrige. Referencia completa: [Operadores de restricción](flagr_operators).

## Avisos

Flagr señala dos configuraciones erróneas silenciosas directamente en el segmento (y en el resumen de la parte superior de Configuración):

- **La cobertura es 0%** — el segmento no coincide con nadie, así que un experimento parece activo pero no lo está.
- **No hay distribución definida** — las entidades que coinciden no tienen ninguna variante que recibir.

Corregir la cobertura o añadir una [distribución](flagr_ui_distribution) elimina el aviso.

Consulta también: [Cómo funciona la evaluación](flagr_evaluation) para ver la ruta completa coincidencia → cobertura → variante.
