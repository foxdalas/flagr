# Resumen de Flagr

## Conceptos de Flagr

Las definiciones de los siguientes conceptos están en la [documentación de la API](https://foxdalas.github.io/flagr/api_docs).

- **Flag**. Puede ser un feature flag, un experimento o una configuración.
- **Etiqueta** (Tag). Es una etiqueta descriptiva asociada a un flag para facilitar su búsqueda y evaluación.
- **Variante** (Variant) representa la posible variación de un flag. Por ejemplo, control/treatment, green/yellow/red, etc.
- **Adjunto de variante** (Variant Attachment) representa la configuración dinámica de una variante. Por ejemplo, si tienes una variante para el botón `green`, puedes controlar dinámicamente qué tono hexadecimal de verde quieres usar (p. ej. `{"hex_color": "#42b983"}`).
- **Segmento** (Segment) representa la segmentación, es decir, el conjunto de audiencia al que queremos dirigirnos. El segmento es la unidad más pequeña de un componente que podemos analizar en las Métricas de Flagr.
- **Restricción** (Constraint) representa las reglas que podemos usar para definir la audiencia del segmento. En otras palabras, la audiencia del segmento se define mediante un conjunto de restricciones. Concretamente, en Flagr las restricciones se conectan con `AND` dentro de un segmento.
- **Distribución** (Distribution) representa la distribución de las variantes dentro de un segmento.
- **Entidad** (Entity) representa el contexto sobre el que vamos a asignar la variante. Normalmente, Flagr espera que el contexto venga junto con la entidad, de modo que puedas definir restricciones basadas en el contexto de la entidad.
- **Cobertura** (Rollout) y lógica aleatoria determinista. El objetivo aquí es garantizar un resultado de evaluación determinista y persistente para las entidades. Pasos para evaluar un flag dado el contexto de una entidad:
    - Toma el ID único de la entidad y aplícale una función hash con distribución uniforme (p. ej. CRC32, MD5).
    - Toma el valor del hash (en base 10) y calcula su módulo 1000. 1000 es el número total de buckets que usa Flagr.
    - Considera la distribución. Por ejemplo, una división 50/50 entre control y treatment significa 0-499 para control y 500-999 para treatment.
    - Considera el porcentaje de cobertura. Por ejemplo, una cobertura del 10% significa que solo se incluyen los primeros 10% de los buckets de control (de nuevo, con el ejemplo del paso anterior, los buckets 0-49 de entre 0-499 se cubrirán con la experiencia de control).

## Ejemplo de uso de Flagr

- Supongamos que queremos lanzar un nuevo botón a los usuarios de EE. UU. y no sabemos qué color funciona mejor. Los colores `green/blue/pink` son tres variantes del flag.
![](images/flagr_running_example_1.png)
![](images/flagr_running_example_4.png)

- Puede que queramos exponer el flag a un pequeño conjunto de usuarios, por ejemplo, los usuarios de California. Así que los usuarios de California son un segmento.
![](images/flagr_running_example_2.png)

- Más adelante descubrimos que a los usuarios de CA les gustó el botón verde, a los de NY el botón rosa y a los de DC el botón azul. Así que tendremos tres segmentos, y cada segmento se define mediante la restricción: `state == ?`. El segmento también puede definirse mediante varias restricciones. Por ejemplo, `state == NY AND Age >= 21`
![](images/flagr_running_example_3.png)
![](images/flagr_running_example_5.png)

- Para realizar pruebas A/B con este flag, podemos probar una división `50%/50%` (Distribución) de `green/blue` y probarla solo en el `20%` (Porcentaje de cobertura) de los usuarios del segmento `CA`. Más adelante podemos fijar el porcentaje de cobertura en `100%`, de modo que todos los usuarios de `CA` reciban verde o azul con un `50%` de probabilidad. Y, por supuesto, si quieres lanzar el `100%` verde al `100%` de los usuarios, basta con fijar la distribución en `100%/0%` verde/azul y un `100%` de porcentaje de cobertura.
![](images/flagr_running_example_7.png)
![](images/flagr_running_example_6.png)

## Arquitectura de Flagr

Flagr tiene tres componentes: el Evaluador de Flagr (Flagr Evaluator), el Gestor de Flagr (Flagr Manager) y las Métricas de Flagr (Flagr Metrics).

- Evaluador de Flagr. El evaluador de Flagr evalúa las solicitudes entrantes.
- Gestor de Flagr. El gestor de Flagr es la pasarela CRUD. Todas las modificaciones de los flags ocurren aquí.
- Métricas de Flagr. Las métricas de Flagr son el pipeline de datos que recopila los resultados de evaluación. Flagr admite Kafka, Kinesis y Google Cloud Pubsub como backends del pipeline (se configuran mediante `FLAGR_RECORDER_TYPE`).

![Arquitectura de Flagr](images/flagr_arch.png)
