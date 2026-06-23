# Gestión de flags

La lista de flags es la pantalla de inicio. Desde aquí creas flags, encuentras los existentes y recuperas los eliminados.

![La lista de flags](images/es/flags-list.png)

## Crear un flag

En la parte superior de la lista, escribe una descripción breve en **Describe el nuevo flag** y usa el botón verde:

- **Crear flag** — crea un flag vacío con solo tu descripción. Las variantes y los segmentos los añades tú en la pantalla siguiente.
- **Crear flag booleano simple** (en el menú desplegable del botón) — crea un flag de encendido/apagado listo para usar: viene con las variantes `on` / `off` y un segmento ya conectado, de modo que puedes activarlo de inmediato.

El botón está desactivado hasta que hayas escrito una descripción. Tras la creación, Flagr abre la página del nuevo flag y muestra una notificación de **Flag creado**.

!> Un flag nuevo está **desactivado** por defecto y no devuelve ninguna variante hasta que lo actives. Configúralo primero y luego enciéndelo. Consulta [Cómo funciona la evaluación](flagr_evaluation).

## Encontrar un flag

El cuadro de **búsqueda** filtra la lista a medida que escribes (los resultados se actualizan tras una breve pausa).

- Pulsa <kbd>/</kbd> en cualquier parte de la página para saltar al cuadro de búsqueda.
- Coincide con el **ID**, la **clave**, la **descripción** y las **etiquetas** del flag, sin distinguir mayúsculas de minúsculas.
- Separa los términos con una **coma** para exigir *todos* ellos. `checkout, beta` coincide con los flags que contienen tanto "checkout" *como* "beta".
- Usa la **×** para borrar la búsqueda.

El contador bajo el cuadro muestra cuántos flags coinciden (`12 flags`), y `de 200 en total` mientras hay una búsqueda activa. Si nada coincide verás **Ningún flag coincide con tu búsqueda**; una instancia vacía muestra **Aún no hay feature flags**.

## La tabla

| Columna | Notas |
|--------|-------|
| **ID del flag** | ID numérico. Haz clic en el encabezado para ordenar (los más recientes primero por defecto). |
| **Descripción** | Descripción de texto libre. |
| **Etiquetas** | Chips de etiquetas, si los hay. |
| **Actualizado por** | Quién cambió el flag por última vez. Se puede ordenar. |
| **Actualizado (UTC)** | Hora del último cambio en UTC. Pasa el cursor por encima para ver un tiempo relativo ("3 hours ago"). Se puede ordenar. |
| **Activado** | Una pastilla de estado `on` / `off`. Usa el filtro de la columna para mostrar solo los flags activados o desactivados. |
| **Acción** | El icono ↗ abre el flag en una pestaña nueva. |

- **Haz clic en una fila** para abrir ese flag.
- **Haz Cmd/Ctrl-clic en una fila** (o clic en el icono ↗) para abrirlo en una pestaña nueva del navegador.
- En pantallas estrechas, las columnas secundarias (Etiquetas, Actualizado por, Actualizado) se ocultan para que el ID, la descripción y el estado se sigan leyendo bien.

Si hay más de 50 flags, aparecen controles de paginación en la parte inferior.

## Flags eliminados y restauración

Eliminar un flag es un **borrado lógico** (soft delete): se oculta, no se destruye. En la parte inferior de la lista, despliega **Flags eliminados** (se carga bajo demanda) para verlos.

Haz clic en **Restaurar** en cualquier fila y confirma: el flag vuelve a la lista activa exactamente como estaba. Consulta [Editar un flag → Eliminar](flagr_ui_editor) para saber cómo funciona la eliminación.
