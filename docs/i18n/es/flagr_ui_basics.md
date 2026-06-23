# Conceptos básicos de la interfaz

Una orientación rápida sobre la interfaz web de Flagr — las partes que son iguales en todas las páginas. El resto de esta sección cubre el flujo de trabajo de los flags en sí: [gestión de flags](flagr_ui_flags), el [editor de flags](flagr_ui_editor), las [variantes](flagr_ui_variants), los [segmentos](flagr_ui_segments), las [distribuciones](flagr_ui_distribution) y las [pruebas y el historial](flagr_ui_testing).

## La barra superior

Todas las páginas comparten una barra de navegación superior:

- **Flagr** (a la izquierda) — vuelve a la lista de flags.
- **API** — abre la [referencia de la API](api) interactiva (Swagger UI) para los endpoints de gestión y de evaluación.
- **Docs** — esta documentación.
- **Versión** — la versión del build en ejecución, útil al reportar problemas.
- **Conmutador de tema** y **selector de idioma** — descritos más abajo.

## Tema claro y oscuro

El conmutador ☀️/🌙 de la barra superior alterna entre los temas **claro y oscuro**. Tu elección se **recuerda** en el navegador, así que se mantiene entre visitas. Hasta que elijas explícitamente, Flagr sigue de forma automática la apariencia de tu sistema operativo (claro u oscuro).

Toda la aplicación —incluida la documentación y los editores JSON— sigue el tema seleccionado.

## Idioma

La interfaz de Flagr está disponible en **English, Русский y Español**. Elige un idioma en el selector de la barra superior; la elección se **recuerda** en el navegador. Si nunca has elegido, Flagr arranca en el idioma preferido de tu navegador cuando es uno de los tres admitidos, y en caso contrario recurre al inglés.

La localización abarca los elementos de la interfaz y esta documentación. Ten en cuenta que tus propios **datos** —claves de flags, descripciones, claves de variantes, descripciones de segmentos, etiquetas— se muestran exactamente como los introdujiste y nunca se traducen.

## Cómo funciona el guardado

Flagr **nunca guarda automáticamente**. Cada cambio es explícito, de modo que nada llega a producción por accidente:

- Cada bloque (el flag, cada variante, cada segmento, cada restricción) tiene su **propio botón Guardar**, activo solo cuando ese bloque tiene ediciones sin guardar.
- **Guardar todos los cambios** en el encabezado fijo guarda todo lo que está pendiente de una sola vez (<kbd>Cmd/Ctrl</kbd>+<kbd>S</kbd>).
- Una insignia de **Cambios sin guardar** aparece siempre que algo está pendiente, y Flagr pide confirmación si intentas salir de la página con ediciones sin guardar.

Los detalles completos —incluido qué ocurre cuando algunas ediciones no son válidas— están en la [guía del editor de flags](flagr_ui_editor).

## Cómo orientarte

- La **lista de flags** es la pantalla de inicio: busca, filtra, crea y reabre flags eliminados. Consulta [Gestión de flags](flagr_ui_flags).
- Al abrir un flag llegas a su **editor**, organizado en una pestaña **Configuración**, una pestaña **Flujo de evaluación** y una pestaña **Historial**. Consulta [Editar un flag](flagr_ui_editor).
