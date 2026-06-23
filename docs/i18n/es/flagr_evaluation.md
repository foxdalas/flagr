# Cómo funciona la evaluación

Cuando evalúas un flag para una **entidad** (un usuario, un dispositivo o una solicitud — cualquier cosa con un ID y un contexto opcional), Flagr recorre una ruta fija y devuelve **una variante**, o ninguna. Entender esta ruta elimina la mayoría de las sorpresas relacionadas con segmentos, coberturas y distribuciones.

## La ruta de evaluación

1. **¿Está habilitado el flag?** Un flag deshabilitado no devuelve ninguna variante: la evaluación se detiene aquí.
2. **Recorre los segmentos de arriba abajo.** Los segmentos están ordenados, y **gana el primero que coincide**. Una vez que un segmento coincide, Flagr deja de examinar los segmentos que están por debajo.
3. **¿La entidad cumple las restricciones del segmento?** Todas las restricciones de un segmento se combinan con `AND`. Un segmento **sin restricciones coincide con todo el mundo**.
4. **¿Está la entidad dentro de la cobertura?** El segmento que coincide tiene un **% de cobertura**: la proporción de entidades coincidentes que realmente se incluyen. La cobertura es determinista por entidad (la misma entidad siempre cae de la misma manera), por lo que una cobertura del 20% siempre incluye al mismo 20%.
5. **Elige una variante de la distribución.** Para una entidad incluida, la **distribución** del segmento decide qué variante recibe (por ejemplo, 50% `on` / 50% `off`).

!> El orden importa: pon primero tus segmentos más específicos. Si un segmento amplio (p. ej. "todo el mundo") está por encima de uno más concreto, el amplio coincide primero y al concreto nunca se llega. Arrastra un segmento por su asa para reordenarlo.

## Cobertura frente a distribución

Son dos pasos diferentes, y una fuente habitual de confusión:

- El **% de cobertura** responde a *"¿está esta entidad dentro del segmento siquiera?"* — controla la inclusión.
- La **distribución** responde a *"¿qué variante recibe una entidad incluida?"* — reparte el tráfico incluido entre las variantes.

Así, un segmento con un **100% de cobertura** y una **distribución 50/50** da una variante a todos los del segmento: la mitad `on`, la mitad `off`. Un segmento con un **20% de cobertura** solo incluye al 20% de las entidades coincidentes; el otro 80% **no recibe ninguna variante**.

!> **Un segmento que coincide pone fin a la evaluación.** «Gana el primero que coincide» se refiere al primer segmento cuyas *restricciones* coinciden. Una vez que eso ocurre, Flagr **no** mira los segmentos inferiores — aunque la entidad quede después fuera de la cobertura y no reciba ninguna variante. El paso al siguiente segmento solo se produce cuando las restricciones *no* coinciden. Por eso un segmento concreto con un 20% de cobertura colocado por encima de uno comodín dejará al 80% de sus entidades coincidentes sin ninguna variante, en lugar de pasarlas al comodín.

## Por qué es determinista

La cobertura y la distribución no echan los dados — convierten la entidad mediante un hash en uno de **1000 buckets**:

```
bucket = crc32( flagID + entityID ) mod 1000
```

El hash lleva como sal el **ID del flag**, lo que tiene dos consecuencias:

- **Estable por entidad y por flag.** El mismo `entityID` cae siempre en el mismo bucket para un flag dado, así que un usuario conserva la misma variante entre llamadas (persistente), y una cobertura del 20% incluye siempre al *mismo* 20%.
- **Independiente entre flags.** Como la sal es el ID del flag, el mismo usuario cae en un bucket *distinto* en cada flag — estar en el grupo de tratamiento de un experimento no dice nada sobre otro. No hay correlación entre flags.

Los 1000 buckets se reparten entre las variantes según los porcentajes de la **distribución** (un reparto 50/50 se queda con los buckets 0–499 y 500–999). El **% de cobertura** se aplica luego *dentro* de la banda de la variante de la entidad: con un 100% de cobertura se incluyen todos los buckets de la banda; con un 20% solo el primer quinto de la banda. Por eso la cobertura y la distribución son dos controles diferentes — el bucket primero elige una variante, y luego la cobertura decide si ese bucket se incluye siquiera.

Para obtener un resultado puntual no persistente, envía un `entityID` vacío — Flagr genera uno aleatorio para esa única llamada (sigue pasando por el mismo hash, así que el resultado es internamente coherente, solo que no repetible).

## ¿Cuándo no recibo ninguna variante?

Hay algunas situaciones que no devuelven ninguna variante. Suelen ser errores de configuración, y la página del flag ahora avisa sobre las dos últimas:

- **El flag está deshabilitado.**
- **Ningún segmento coincidió** — el contexto de la entidad no cumplió las restricciones de ningún segmento, y no hay un segmento general que sirva de comodín.
- **La entidad coincidió con un segmento, pero quedó fuera de su % de cobertura** — por ejemplo, la cobertura es del 0%, así que no se incluye a nadie.
- **El segmento que coincidió no tiene distribución** — no hay ninguna variante que repartir.

!> La página del flag te señala las dos últimas: un segmento con un 0% de cobertura, o sin distribución, muestra una advertencia para que un experimento nunca se ponga en marcha en silencio sin nadie dentro.

## Compruébalo con una entidad real

No tienes que razonar todo esto mentalmente:

- La **Consola de depuración** (en la página del flag) envía una entidad de ejemplo a través del flag y muestra qué segmento coincidió y qué variante recibió — es de solo lectura, nunca afecta al tráfico real.
- El **Flujo de evaluación** (una pestaña en la página del flag) visualiza toda esta ruta para una entidad de ejemplo.

!> Pon entre comillas los valores de restricción de tipo cadena — `"CA"`, no `CA`. Un valor sin comillas se interpreta como una variable y silenciosamente nunca coincide.
