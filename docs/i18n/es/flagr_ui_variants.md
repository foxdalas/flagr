# Variantes

Las **variantes** son los posibles valores que un flag puede devolver: `on`/`off`, `control`/`treatment`, `green`/`blue`/`pink`, etc. La evaluación siempre devuelve una variante (o ninguna); tu código se ramifica según la clave de la variante.

La sección Variantes está en la pestaña **Configuración** del flag.

![La sección Variantes](images/es/variants.png)

## Crear una variante

Escribe una **Clave de la variante** en el campo de la parte inferior de la sección y haz clic en **Crear variante**. La clave debe ser única dentro del flag y puede contener letras, números, guiones, barras, puntos y dos puntos (hasta 63 caracteres); aparece un mensaje en línea si no es válida, y el botón permanece desactivado hasta que lo sea.

Si un flag aún no tiene variantes, verás un marcador de posición **No variants defined yet**.

## Editar o eliminar una variante

Cada variante muestra su `#id` y una **Clave de la variante** editable:

- Cambia la clave y haz clic en **Guardar variante** (se activa solo cuando hay ediciones sin guardar).
- El icono de la papelera elimina la variante.

!> No puedes eliminar una variante que la [distribución](flagr_ui_distribution) de un segmento todavía usa. Flagr lo bloquea y te indica que elimines el segmento o edites su distribución primero; de lo contrario, el tráfico apuntaría a una variante que ya no existe.

## Adjunto de la variante

Cada variante puede llevar un **Adjunto de la variante**: un objeto JSON arbitrario que se devuelve junto con la variante. Así es como entregas [configuración dinámica](flagr_use_cases): colores, textos, límites, parámetros de funcionalidad.

Despliega **Adjunto de la variante** bajo una variante para abrir el editor JSON y añadir pares clave/valor, por ejemplo:

```json
{ "color_hex": "#42b983", "layout": "modern" }
```

El adjunto vuelve en la respuesta de la evaluación como `variantAttachment`. El JSON no válido se rechaza al guardar, de modo que no puedes almacenar un adjunto roto.

!> ¿Sirves un valor tipado a través de [OpenFeature/OFREP](flagr_ofrep)? Colócalo bajo una clave `value` (p. ej. `{ "value": 42 }`): OFREP resuelve el valor del flag a partir de `attachment.value`.

A continuación: dirige el tráfico entre estas variantes con [Distribuciones](flagr_ui_distribution).
