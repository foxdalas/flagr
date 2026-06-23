# Pruebas e historial

Antes (y después) de activar un flag, puedes comprobar exactamente cómo se comporta y revisar todos los cambios por los que ha pasado — todo desde la página del flag, sin tocar el tráfico real.

## Consola de depuración

La **Consola de depuración** (en la pestaña **Configuración**) ejecuta evaluaciones reales contra el flag y muestra el resultado en bruto. Es de **solo lectura** — nunca afecta al tráfico de producción ni registra datos.

![La consola de depuración](images/es/debug-console.png)

Tiene dos secciones:

- **Evaluación** — evalúa el flag para una sola entidad. El panel izquierdo es la solicitud (`POST /api/v1/evaluation`), el panel derecho es la respuesta. Edita el JSON de la solicitud — `entityID`, `entityContext`, etc. — y haz clic en **POST /api/v1/evaluation**. La respuesta muestra el `variantKey` que coincide, el `segmentID`, el attachment y un registro de depuración.
- **Evaluación por lotes** — la misma idea para muchas entidades a la vez (`POST /api/v1/evaluation/batch`).

Úsala para responder *"¿qué recibe este usuario?"* con un ejemplo concreto. El esquema de solicitud/respuesta está documentado en la guía de la [API de evaluación](flagr_eval_api).

!> Pon entre comillas los valores de texto de las restricciones en el contexto igual que haces en las restricciones — consulta [Operadores de restricción](flagr_operators).

## Flujo de evaluación

La pestaña **Flujo de evaluación** visualiza toda la [ruta de evaluación](flagr_evaluation) y te permite trazar una entidad de muestra a través de ella paso a paso.

![El trazador del flujo de evaluación](images/es/eval-flow.png)

1. Introduce un **ID de entidad** y un **Contexto de entidad (JSON)** — p. ej. `{"country":"DE"}`.
2. Haz clic en **Ejecutar traza**.

Flagr resalta entonces la ruta exacta que siguió la entidad:

- La puerta **flag activado** (verde si está activo, rojo si está inactivo).
- Cada **segmento**, de arriba abajo, con una etiqueta de estado:

| Estado | Significado |
|--------|---------|
| **✓ Coincide** | Las restricciones coincidieron y la entidad está dentro de la cobertura — este segmento asignó la variante. |
| **Excluido por cobertura** | Las restricciones coincidieron, pero la entidad quedó fuera de la cobertura %. |
| **✗ No coincide** | Las restricciones no coincidieron. |
| **No alcanzado** | Un segmento anterior ya ganó, así que este nunca se evaluó. |
| **Error de evaluación** | No se pudo evaluar una restricción (p. ej. una expresión o un contexto mal formados). El segmento se trata como una no coincidencia. |

- Un nodo terminal que muestra el resultado, y un **banner de resultado** en la parte superior: qué variante se asignó, o por qué no hay ninguna (excluido por cobertura / ningún segmento coincidió / flag desactivado).

Haz clic en **Limpiar** para reiniciar la traza. Igual que la Consola de depuración, esto nunca afecta al tráfico real.

## Historial

La pestaña **Historial** es el registro de auditoría del flag. Cada entrada es un **snapshot** tomado cuando el flag cambió, del más reciente al más antiguo, y muestra:

![Un snapshot del historial con su resumen de cambios](images/es/history.png)

- Un **resumen** en lenguaje sencillo de lo que cambió (p. ej. *«Cobertura (beta): 10% → 50%»*, *«Variante añadida 'treatment'»*, *«Flag activado»*).
- **Quién** hizo el cambio y **cuándo** (UTC, con un tooltip que muestra el tiempo relativo).
- Un interruptor **Mostrar diff técnico** que revela el diff JSON exacto al estilo git de esa revisión.

El historial se carga al abrir la pestaña. Úsalo para ver quién cambió qué, y para entender cómo llegó un flag a su estado actual.

> ¿Buscas **recuperar un flag eliminado**? Eso está en la lista de flags, no aquí — consulta [Gestionar flags](flagr_ui_flags).
