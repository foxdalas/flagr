# Casos de uso de Flagr

Los **feature flags, las pruebas A/B y la configuración dinámica** tienen que ver con entregar la experiencia a la audiencia objetivo adecuada,
por lo que comparten algunos componentes en el diseño de producto de Flagr. De hecho, Flagr los unifica en el concepto de
un flag, y la instrumentación del código es similar entre ellos.


## Feature flagging

Un patrón habitual para el feature flagging es un interruptor binario de encendido/apagado (on/off). La mayoría son kill switches y, a veces, un feature flag tendrá una audiencia objetivo concreta. El siguiente es un ejemplo en pseudocódigo: dada una entidad (un usuario, una solicitud o una cookie web), Flagr evalúa la entidad según la configuración del flag.

```
evaluation_result = flagr.post_evaluation( entity )

if (evaluation_result.variant_id == new_feature_on) {
    // do something new and amazing here.
} else {
    // do the current boring stuff.
}
```

Y un feature flag típico se puede configurar desde la interfaz de Flagr así:

```
Variants
  - on
  - off

Segment
  - Constraints (depends on your targeted audience, e.g. state == "CA")
  - Rollout Percent: 100%
  - Distribution
    - on: 100%
    - off: 0%
```

Ejemplo de configuración en la interfaz (el aspecto del frontend puede cambiar con rapidez):
![Variantes de un flag en la interfaz](images/es/variants.png)


## Experimentación - pruebas A/B

Si queremos ejecutar experimentos de pruebas A/B sobre varias variantes con una audiencia objetivo,
puede que queramos instrumentar el código con Flagr como en el siguiente pseudocódigo:

```
evaluation_result = flagr.post_evaluation( entity )

if (evaluation_result.variant_id == treatment1) {
    // do the treatment 1 experience
} else if (evaluation_result.variant_id == treatment2) {
    // do the treatment 2 experience
} else if (evaluation_result.variant_id == treatment3) {
    // do the treatment 3 experience
} else {
    // do the control experience
}
```

Y un flag típico de pruebas A/B se puede configurar desde la interfaz de Flagr así:

!> ¡El orden de varios segmentos es importante! Las entidades caerán
en el **primer** segmento que cumpla **todas** sus restricciones.

```
Variants
  - control
  - treatment1
  - treatment2
  - treatment3

Segment
  - Constraints (state == "CA")
  - Rollout Percent: 20%
  - Distribution
    - control: 25%
    - treatment1: 25%
    - treatment2: 25%
    - treatment3: 25%
Segment
  - Constraints (state == "NY" AND age >= 21)
  - Rollout Percent: 100%
  - Distribution
    - control: 50%
    - treatment1: 0%
    - treatment2: 25%
    - treatment3: 25%
```

Ejemplo de configuración en la interfaz (el aspecto del frontend puede cambiar con rapidez):
![Segmentación en la interfaz](images/es/segments.png)
![Edición de la distribución de variantes](images/es/distribution.png)


## Configuración dinámica

También puedes aprovechar el **Adjunto de variante** (Variant Attachment) para ejecutar configuración dinámica, suministrando un adjunto que sea un objeto JSON válido.

!> Antes de [v1.1.3](https://github.com/foxdalas/flagr/releases/tag/1.1.3), dentro del adjunto de objeto JSON solo se admitían pares clave:valor de tipo **string:string**.

Por ejemplo, el color_hex de la variante verde se puede configurar dinámicamente:

```
evaluation_result = flagr.post_evaluation( entity )
green_color_hex = evaluation_result.variantAttachment["color_hex"]
```

```
Variants
  - green
    - attachment: {"color_hex": "#42b983"} OR {"color_hex": "#008000"}
  - red
    - attachment: {"color_hex": "#ff0000"}

Segment
  - Constraints: null
  - Rollout Percent: 100%
  - Distribution
    - green: 100%
    - red: 0%
```

![Una variante con un adjunto JSON](images/es/variants.png)
