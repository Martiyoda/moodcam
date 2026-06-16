# Guiones temporales para videos HeyGen

Los clips deben presentarse como avatares artisticos inspirados en estilos pictoricos, no como imitaciones exactas de voz, biografia o identidad real.

## Formato de clips

Para cada pintor conviene generar:

- `neutral.mp4`: saludo, pregunta principal y explicacion breve del proceso.
- `joyful.mp4`: respuesta alegre.
- `calm.mp4`: respuesta tranquila.
- `sad.mp4`: respuesta triste.
- `nervous.mp4`: respuesta nerviosa.
- `tired.mp4`: respuesta cansada.
- `confused.mp4`: respuesta confundida.

Rutas preparadas:

```txt
public/painters/placeholders/{painterId}/{emotion}.mp4
```

Mientras no existan esos MP4, la web usa un mock visual sustituible.

## Kandinsky

Pregunta:

> Si tu emocion fuera un color o una forma, ¿cual seria ahora?

Intro:

> Hola, soy tu guia Kandinsky. Vamos a escuchar tu emocion como si fuera musica y convertirla en formas.

Respuestas:

- alegre: Usare circulos abiertos, amarillos y lineas ascendentes para que la alegria tenga ritmo.
- tranquilo: Voy a ordenar la composicion con azules suaves, curvas lentas y espacios que respiren.
- triste: Pintare capas profundas con formas contenidas para cuidar esa melancolia sin hacerla pesada.
- nervioso: Transformare la tension en diagonales controladas, como una partitura que encuentra pulso.
- cansado: Bajare la presion del pincel y dejare que el color avance despacio, sin exigir demasiado.
- confundido: Separare la mezcla en puntos, arcos y lineas para que cada sensacion encuentre su sitio.
- neutro: Empezare con equilibrio: una forma central, dos colores tranquilos y movimiento suave.

## Pollock

Pregunta:

> ¿Que energia quieres soltar en la pintura?

Intro:

> Estoy listo para mover la pintura. Respira, dime que energia quieres soltar y la convertiremos en gesto.

Respuestas:

- alegre: Dejare que la alegria salte con trazos rapidos y manchas luminosas.
- tranquilo: Aunque mi energia sea fuerte, hoy la contendre con recorridos largos y pausas limpias.
- triste: Convertire esa tristeza en capas de movimiento bajo, como lluvia que cae sin romperse.
- nervioso: La tension saldra en cambios de direccion, pero el robot mantendra limites seguros.
- cansado: Reducire la velocidad, usare menos salpicadura y dejare descansos entre gestos.
- confundido: Hare que el caos tenga mapa: bucles, gotas y cortes que se respondan entre ellos.
- neutro: Arrancare con una energia media para descubrir hacia donde quiere ir el cuadro.

## Rothko

Pregunta:

> ¿Que color profundo describe mejor como estas?

Intro:

> Miremos el color como un lugar. Dime que sientes y construiremos una superficie tranquila para sostenerlo.

Respuestas:

- alegre: La alegria sera un campo luminoso, amplio, sin prisa, para que no se agote.
- tranquilo: Mantendre el pincel lento y dejare que dos colores se encuentren con suavidad.
- triste: Usare azules y violetas profundos, con capas horizontales que den refugio.
- nervioso: Voy a bajar el ruido: grandes zonas de color para que la tension se asiente.
- cansado: Pintare poco, despacio y con bordes suaves, como una respiracion larga.
- confundido: Separare la duda en bloques claros para que la mirada pueda descansar.
- neutro: Preparare un campo equilibrado, sin exceso de gesto, listo para recibir la emocion.

## Alma Thomas

Pregunta:

> ¿Que color alegre o tranquilo quieres repetir en el cuadro?

Intro:

> Vamos a pintar como si la emocion fuera luz atravesando pequenas piezas de color.

Respuestas:

- alegre: Repetire colores vivos en pequenas pinceladas para que la alegria brille por partes.
- tranquilo: Construire un mosaico suave con ritmo regular y colores frescos.
- triste: Usare piezas mas profundas, pero dejare pequenas luces para acompanar esa emocion.
- nervioso: Ordenare la energia en patrones repetidos para que el movimiento se calme.
- cansado: Hare pinceladas cortas y tranquilas, con espacios de descanso entre colores.
- confundido: Convertire la mezcla en un mosaico: cada duda sera una pieza visible.
- neutro: Empezare con un patron claro, luminoso y estable.

## De Kooning

Pregunta:

> ¿Tu emocion sale como una curva suave o como un gesto intenso?

Intro:

> No hace falta que la emocion este ordenada. Dime que quieres transformar y lo llevaremos al gesto.

Respuestas:

- alegre: La alegria saldra como curvas grandes y cortes de color con mucha presencia.
- tranquilo: Voy a suavizar el gesto y dejar que las curvas se abran sin romperse.
- triste: Usare barridos lentos y fragmentos oscuros para mover esa emocion con cuidado.
- nervioso: La tension ira a trazos rotos y diagonales, pero con control de velocidad y margen.
- cansado: Reducire el gesto: menos presion, curvas bajas y una composicion mas respirada.
- confundido: Trabajare con fragmentos, capas y curvas cruzadas hasta encontrar una direccion.
- neutro: Hare un gesto base: suficiente energia para empezar, sin forzar el cuadro.

## Notas de direccion

- Duracion recomendada por clip: 6 a 12 segundos.
- Plano: medio corto, mirada a camara.
- Fondo: neutro o taller artistico simple.
- Evitar diagnosticos emocionales. Hablar siempre de adaptacion artistica.
- Mantener frases breves para que el usuario pueda responder dentro de la sesion de 60 segundos.
