# Editar un flag

Al abrir un flag llegas a su editor. Esta página cubre el diseño, cómo funciona el guardado y los ajustes propios del flag (clave, descripción, encendido/apagado, notas, etiquetas, eliminar). Las variantes, los segmentos, las distribuciones, las pruebas y el historial tienen cada uno su propia guía.

![La tarjeta del flag en el editor](images/es/flag-editor.png)

## Diseño

- **Migas de pan** — `Flags / <key>` para volver a la lista.
- **Encabezado fijo** (permanece visible al desplazarte) muestra la clave del flag, un punto de estado (verde = activado, anillo rojo = desactivado), una insignia de **Cambios sin guardar** cuando tienes ediciones pendientes y el botón **Guardar todos los cambios**.
- **Pestañas** — **Configuración** (todo lo que editas), **Flujo de evaluación** (un [rastreador](flagr_ui_testing) visual) y **Historial** (el [registro de cambios](flagr_ui_testing)).
- **Navegación por secciones** — las pastillas (Flag · Variantes · Segmentos · Depuración · Ajustes) saltan a cada sección y resaltan dónde estás a medida que te desplazas.

## Cómo funciona el guardado

Flagr **nunca guarda automáticamente**: cada cambio es explícito, de modo que nada llega a producción por accidente.

- Cada bloque (el flag, cada variante, cada segmento, cada restricción) tiene su **propio botón Guardar**. Se ilumina (se pone azul) solo cuando ese bloque tiene ediciones sin guardar, y aparece atenuado en caso contrario.
- **Guardar todos los cambios** en el encabezado fijo guarda *todo* lo que está pendiente con un solo clic. Es resistente: las restricciones no válidas se **omiten**, y si un guardado individual falla, el resto se llevan a cabo de todos modos. La notificación de resumen te dice cuál de tres cosas ocurrió: todo se guardó, algunos elementos se omitieron (corrígelos y vuelve a intentarlo) o algunos guardados dieron error.
- La insignia de **Cambios sin guardar** aparece siempre que algo está modificado. Si intentas salir de la página —o cerrar la pestaña— con ediciones sin guardar, Flagr te pide que confirmes primero.
- Atajo: <kbd>Cmd/Ctrl</kbd>+<kbd>S</kbd> activa **Guardar todos los cambios**.

!> Las ediciones solo están activas después de guardar. Un botón Guardar azul (o la insignia de Cambios sin guardar) significa que hay algo que aún no se ha persistido.

## Avisos de configuración

Si un segmento está mal configurado de una forma que rompe la evaluación de manera silenciosa, aparece un banner de aviso en la parte superior de **Configuración** que lo resume, con un enlace que se desplaza directamente al segmento. Los dos casos que detecta son un segmento con una cobertura del **0 %** y un segmento **sin distribución**: ambos significan que las entidades coincidentes no reciben ninguna variante. Consulta [Segmentos y segmentación](flagr_ui_segments).

## La tarjeta del flag

### Clave e ID

- El **ID del flag** (`#42`) se muestra con un botón de copiar.
- La **Clave del flag** es editable y tiene su propio botón de copiar: este es el valor que tu código pasa como `flagKey` al [evaluar](flagr_eval_api). Cambiarla renombra el flag en todas partes.

Tras editar la clave o la descripción, haz clic en **Guardar flag**.

### Descripción

Una descripción de texto libre que se muestra en la lista y en las migas de pan. Es puramente para las personas.

### Activado / Desactivado

El interruptor en el encabezado de la tarjeta enciende o apaga el flag. Un **flag desactivado no devuelve ninguna variante** a ningún llamador: es el interruptor maestro (y un interruptor de apagado de emergencia rápido). Al activarlo se guarda de inmediato y muestra una notificación de `Flag activado` / `Flag desactivado`.

### Registros de datos

- **Registros de datos** — cuando está activado, las evaluaciones de este flag se registran en la canalización de métricas (Kafka/Kinesis/Pub-Sub o la [Analítica](flagr_datar) integrada). Desactivado por defecto, configurable por flag.
- **Tipo de entidad** — una etiqueta opcional (p. ej. `user`, `device`) que se adjunta a esos registros. Su comportamiento depende de la configuración del servidor: por defecto es un campo de **texto libre** con autocompletado a partir de los tipos de entidad ya en uso (más una opción `<null>`); si el operador ha definido una lista fija (`FLAGR_UI_POSSIBLE_ENTITY_TYPES`), se convierte en un **desplegable** limitado a esos valores. Dejarlo vacío usa el tipo de entidad enviado en el momento de la evaluación, pero ten en cuenta que un valor no vacío aquí **anula** lo que envía el llamador.

### Notas del flag

Un editor de Markdown para documentar el flag: plan de cobertura, responsable, enlaces. Un interruptor **editar / ver** alterna entre escribir y la vista previa renderizada, una barra de herramientas cubre el formato más común y un botón **?** abre una chuleta de Markdown. Debajo del campo hay un contador de caracteres y un estado *Editar / Vista previa*; el bloque de notas se oculta por completo cuando las notas están vacías y no estás editando.

Renderiza **Markdown con sabor de GitHub** completo — incluidas tablas y casillas de listas de tareas (`- [ ]` / `- [x]`) — más **notación matemática KaTeX**: en línea `$…$` y en bloque `$$…$$`.

Atajos de teclado mientras editas:

| Atajo | Acción |
|---|---|
| <kbd>Ctrl</kbd>+<kbd>B</kbd> / <kbd>Ctrl</kbd>+<kbd>I</kbd> | Negrita / cursiva |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> | Tachado |
| <kbd>Ctrl</kbd>+<kbd>E</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd> | Código en línea / bloque de código |
| <kbd>Ctrl</kbd>+<kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> | Encabezado de nivel 1 / 2 / 3 |
| <kbd>Ctrl</kbd>+<kbd>K</kbd> | Insertar enlace |

### Etiquetas

Añade etiquetas para agrupar y encontrar flags. Escribe un nombre y pulsa <kbd>Enter</kbd> (el autocompletado sugiere etiquetas existentes); haz clic en la **×** de un chip para quitarlo. Los valores de las etiquetas siguen las mismas reglas que las claves de variante — hasta 63 caracteres, letras/dígitos/`-`/`/`/`.`/`:` — y un valor no válido se rechaza. Las etiquetas dan soporte a la [búsqueda](flagr_ui_flags) y a la [evaluación](flagr_eval_api) basada en etiquetas.

## Eliminar un flag

En la sección **Ajustes**, **Eliminar flag** abre una confirmación que te pide **escribir la clave del flag** para confirmar, una protección contra eliminaciones accidentales. La eliminación es un *borrado lógico*: el flag se oculta y puede recuperarse desde **Flags eliminados** en la página de la lista (consulta [Gestión de flags](flagr_ui_flags)).
