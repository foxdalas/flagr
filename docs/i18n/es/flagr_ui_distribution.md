# Distribuciones

Una **distribución** reparte el tráfico *dentro* de un segmento entre las variantes — 50/50, 90/10, 100% a una variante, y así sucesivamente. Una vez que la [cobertura](flagr_ui_segments) del segmento incluye a una entidad, la distribución decide qué variante recibe realmente.

Cada segmento tiene su propia distribución, que se muestra en la pestaña **Configuración** del flag.

## La barra de distribución

Cuando un segmento tiene una distribución, una barra de colores muestra el reparto: cada variante recibe una porción proporcional a su porcentaje, con una leyenda de las claves de variante y sus porcentajes. Un segmento sin distribución muestra **Sin distribución configurada** en su lugar — corrígelo con **editar**. Si una distribución guardada no suma de algún modo el 100%, la barra muestra un **⚠ aviso** con la suma real.

## Editar una distribución

![El diálogo Editar distribución con preajustes](images/es/distribution.png)

Haz clic en **editar** en la Distribución del segmento para abrir el editor:

1. **Marca las variantes** que quieras incluir. Una variante marcada empieza en 0% y se le puede asignar una proporción.
2. Define la proporción de cada una con el **control deslizante** o el cuadro numérico.
3. Los porcentajes **deben sumar 100%** — hasta que lo hagan, una alerta muestra la suma actual y **Guardar** permanece desactivado.
4. Pulsa **Guardar** para aplicar. Las variantes que se queden en **0% se descartan** de la distribución guardada — para mantener una variante en el reparto, asígnale una proporción distinta de cero.

## Preajustes

El editor ofrece puntos de partida con un solo clic:

| Preajuste | Qué establece |
|--------|--------------|
| **Reparto equitativo** | Reparte el 100% de forma equitativa entre las variantes seleccionadas (p. ej. 33/33/34). |
| **100% control** | Pone el 100% en la primera variante y 0% en el resto. |
| **Canary 1/99** | 1% a la primera variante, 99% a la segunda — una porción canary mínima. |
| **Gradual 10/90** | 10% a la primera, 90% a la segunda — una pequeña implantación por fases. |

Canary y Gradual necesitan al menos dos variantes seleccionadas. Si no hay ninguna variante marcada cuando aplicas un preajuste, Flagr las selecciona todas por ti primero. Después de aplicar un preajuste, todavía puedes ajustar los controles deslizantes con precisión.

## Cobertura frente a distribución

Son dos pasos diferentes, y una fuente habitual de confusión:

- La **Cobertura %** (en el [segmento](flagr_ui_segments)) responde a *"¿está esta entidad dentro del segmento siquiera?"* — controla la inclusión.
- La **Distribución** responde a *"¿qué variante recibe una entidad incluida?"* — reparte el tráfico ya incluido.

Así, un segmento al **100% de cobertura** con una **distribución 50/50** da una variante a todos los que están en el segmento — la mitad cada una. Un segmento al **20% de cobertura** solo incluye al 20% de las entidades que coinciden; la distribución reparte luego *a esas*. La imagen completa está en [Cómo funciona la evaluación](flagr_evaluation).

!> Un segmento que coincide pero **sin distribución** no devuelve ninguna variante — Flagr te avisa de esto (consulta [Segmentos y segmentación](flagr_ui_segments)).
