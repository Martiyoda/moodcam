# Inner Synergy

**Where inner worlds become art**

Esplubot Nazaret Jr. | Colegio Nazaret, Esplugues de Llobregat

WRO Future Innovators 2026 | Cocreación: humanos, robots e IA

## Índice

1. Presentación del equipo
2. Resumen de la idea del proyecto
3. Investigación y desarrollo de la idea
4. Presentación de la solución robótica
5. Desarrollo técnico del prototipo
6. Impacto social, innovación y emprendimiento
7. Lista de fuentes
8. Anexos


## 1. Presentación del equipo

Somos Esplubot Nazaret Jr., un equipo formado por tres estudiantes de 3.º de ESO del colegio Nazaret de Esplugues de Llobregat: Martí, Víctor y Xavi. Nos une nuestra pasión por la ciencia, la tecnología y, sobre todo, la robótica.

Este es nuestro segundo año participando en el reto Future Innovators de la WRO. Después de la experiencia del curso pasado, este año volvemos con más conocimientos, nuevas ideas y un proyecto que combina arte, inteligencia artificial y robótica.

También tenemos que reconocer algo: somos bastante expertos en dejar algunas cosas para el último momento. A veces necesitamos notar que el reloj corre para activar nuestro modo más productivo. Aunque trabajar bajo presión no siempre es la mejor estrategia, hemos aprendido a organizarnos mejor, a tomar decisiones rápidas y a apoyarnos cuando el proyecto se complica.

Nuestra solución ha sido desarrollada de manera conjunta. Desde las primeras ideas hasta el diseño del robot, hemos participado los tres, compartiendo opiniones, resolviendo problemas y tomando decisiones en equipo. Aun así, cada uno ha ido especializándose en las partes en las que podía aportar más:

- Martí: Desarrollo del brazo robótico y diseño de realidad virtual

- Víctor: Estructura y gestión de datos en JSON y desarrollo de la API

- Xavi: Estructura y gestión de datos en JSON y programación del brazo robótico

La investigación del problema, la búsqueda de información, la toma de decisiones y la redacción del informe se han realizado entre los tres. De esta manera, todos conocemos el proyecto completo y podemos explicar tanto su objetivo como su funcionamiento técnico.

Lo que mejor define a nuestro equipo es que combinamos perfiles diferentes para construir una misma idea. Podemos discutir, equivocarnos, cambiar de opinión o llegar un poco justos de tiempo, pero cuando trabajamos juntos conseguimos transformar una idea en un prototipo real.

## 2. Resumen de la idea del proyecto

Nuestro proyecto se desarrolla dentro del área “Cocreación: humanos, robots e IA” del reto WRO Future Innovators 2026. La propuesta consiste en crear una solución robótica que ayude a niños de edades tempranas y a personas autistas, o con otras necesidades de apoyo en la expresión emocional, a comunicar lo que sienten mediante una experiencia artística interactiva.

En algunas situaciones, expresar emociones con palabras puede resultar difícil. Por ello, nuestro robot propone una forma alternativa y creativa de comunicación: transformar señales relacionadas con el estado emocional del usuario en una pintura realizada conjuntamente con la tecnología. La persona participa activamente en la creación de la obra, mientras que el robot convierte esa información en colores, movimientos y trazos.

El funcionamiento comienza con una aplicación que analiza la expresión facial del usuario para estimar las dos emociones predominantes y representarlas mediante porcentajes. Estos datos se envían en formato JSON a un sistema basado en inteligencia artificial, que combina la información emocional con referencias pictóricas estudiadas a partir de cuatro artistas: Jackson Pollock, Alma Thomas, Mark Rothko y Wassily Kandinsky. Han sido seleccionados por la variedad de sus lenguajes visuales, basados en elementos como el color, la forma, el ritmo o el gesto, que permiten explorar distintas maneras de representar emociones.

El usuario podrá elegir la referencia artística con la que desea crear su obra. A partir de esa elección y de los datos emocionales obtenidos, el sistema generará instrucciones para un brazo robótico construido mediante impresión 3D y controlado con ESP32, que realizará la pintura de manera autónoma. Así, cada resultado será diferente y estará relacionado con la interacción de la persona participante.

La innovación principal del proyecto es unir arte, robótica e inteligencia artificial para que el robot actúe como un compañero creativo y no únicamente como una máquina que pinta. La solución no pretende diagnosticar emociones ni sustituir la comunicación humana o el acompañamiento profesional, sino ofrecer una herramienta lúdica e inclusiva que facilite la expresión personal, la creatividad y la participación artística.

Eslogan: Where inner worlds become art.


## 3. Investigación y desarrollo de la idea

### 3.1. Definición del problema

El primer paso para desarrollar nuestro proyecto fue analizar el tema de la WRO Future Innovators 2026: “Robots y cultura” y explorar las tres áreas propuestas por el reto.

Para ello realizamos una primera lluvia de ideas organizada por áreas. Surgieron numerosas propuestas, especialmente relacionadas con la protección del patrimonio cultural o el uso de robots para analizar factores que deterioran el arte. También analizamos problemas como el impacto del cambio climático, los conflictos armados o el turismo masivo en la conservación del patrimonio.

También valoramos el área “Vivir el arte y la historia con robots”, con ideas como guías interactivos o sistemas robóticos para recrear experiencias culturales. Sin embargo, durante la investigación inicial observamos que ya existen muchas propuestas tecnológicas en museos, monumentos y espacios culturales, como visitas virtuales, experiencias inmersivas o recursos interactivos. Por este motivo, aunque nos parecía un área interesante, decidimos no centrar nuestro proyecto en ella.

La tercera área, “Cocreación: humanos, robots e IA”, fue la que nos despertó mayor interés. Nos interesaba desarrollar una solución en la que el robot participara en un proceso creativo junto a una persona. Además, esta área nos permitía unir programación, inteligencia artificial, robótica, creatividad y desarrollo de soluciones con impacto social.

Finalmente decidimos centrar el proyecto en “Cocreación: humanos, robots e IA”. Esta elección se basó en la posibilidad de desarrollar una solución con una finalidad más humana y social. Nuestra intención era diseñar una solución en la que el robot colaborara con la persona y ayudara a transformar una parte de su mundo interior en una creación artística.

Una vez elegida el área, realizamos una segunda lluvia de ideas centrada únicamente en la cocreación. La idea fue evolucionando hacia un proyecto de carácter social, especialmente orientado a personas que pueden encontrar dificultades para comunicarse o expresar sus emociones de forma convencional.

Decidimos orientar el proyecto hacia niños de edades tempranas, incluyendo también a niños autistas o con otras necesidades de apoyo en la comunicación emocional. Este área ampliaba el alcance de la solución, ya que no se dirige únicamente a personas neurodivergentes, sino a cualquier niño que pueda beneficiarse de una forma más visual, creativa e inclusiva de expresar emociones.


Así definimos el problema principal del proyecto: no siempre es fácil expresar lo que sentimos con palabras, especialmente durante la infancia o cuando existen dificultades en la comunicación emocional. Frente a este problema, el arte puede convertirse en una vía alternativa de expresión, utilizando colores, formas, gestos y movimientos para representar el mundo interior de una persona.

A partir de esta reflexión nació Inner Synergy, una solución de cocreación artística en la que una

persona, una inteligencia artificial y un brazo robótico colaboran para crear una pintura.

### 3.2. Investigación de soluciones robóticas relacionadas con el arte

Uno de los proyectos más significativos en este ámbito es Ai-Da, descrita como la “primera artista robot humanoide ultra realista del mundo”. Su nombre hace referencia a Ada Lovelace, considerada una figura pionera en la historia de la programación. Ai-Da se presenta como un proyecto artístico y tecnológico diseñado para generar debate sobre la creatividad, la autoría, la ética de los avances tecnológicos y el papel de la inteligencia artificial en la sociedad contemporánea.

Su funcionamiento se basa en una colaboración multidisciplinar. Su hardware fue desarrollado por Engineered Arts, una empresa especializada en robótica humanoide, mientras que sus capacidades gráficas y algoritmos fueron diseñados por investigadores de la Universidad de Oxford. Técnicamente, su proceso creativo comienza con la captura de imágenes mediante cámaras integradas en sus ojos. Estas imágenes son procesadas por algoritmos de visión artificial, que transforman la información visual en coordenadas espaciales. Después, un brazo robótico articulado interpreta estos datos y ejecuta trazos sobre papel o lienzo.

En 2022, Ai-Da alcanzó un nuevo avance con la incorporación de un brazo robótico capaz de utilizar una paleta y pintar al óleo. Esto permitió aumentar la textura y complejidad de sus obras, acercando el resultado a técnicas más tradicionales de las artes plásticas.

La importancia de Ai-Da no está únicamente en el resultado final de sus obras, sino en su capacidad para actuar como un “catalizador de conversaciones vitales” sobre el uso de las nuevas tecnologías. El proyecto cuestiona la idea de que la creatividad sea una capacidad exclusivamente humana. Bajo los criterios de la profesora Margaret Boden, una obra generada por inteligencia artificial podría considerarse creativa si es nueva, sorprendente y posee valor cultural.

Ai-Da ha tenido un importante reconocimiento. Ha protagonizado exposiciones individuales en el Design Museum de Londres y ha participado en eventos internacionales como la Bienal de Venecia. En noviembre de 2024, su obra “AI God: Portrait of Alan Turing” se vendió en la casa de subastas Sotheby’s por 1,1 millones de dólares. Además, Ai-Da fue el primer robot en comparecer ante la Cámara de los Lores del Reino Unido para ofrecer evidencia sobre el futuro de las industrias creativas ante el avance tecnológico.

Otro referente fundamental para nuestro proyecto fue el trabajo de Sougwen Chung, artista e investigadora chino-canadiense especializada en la colaboración entre humanos y máquinas. Su proyecto más representativo es DOUG (Drawing Operations Unit: Generation), una serie de unidades

robóticas iniciada en 2015 que explora diferentes formas de interacción entre el dibujo humano, la


inteligencia artificial y la autonomía robótica. A diferencia de otros sistemas que buscan producir una obra terminada de forma automática, DOUG se centra en el diálogo entre la artista y la máquina.

El desarrollo de DOUG ha pasado por varias generaciones. En DOUG_1, el sistema se basaba en el mimetismo posicional. En DOUG_2, el proyecto incorporó memoria y aprendizaje automático. El sistema fue entrenado con el propio estilo de dibujo de la artista, de manera que la inteligencia artificial ya no se limitaba a copiar sus movimientos, sino que podía utilizar una memoria computacional. Posteriormente, el proyecto evolucionó hacia sistemas multirobóticos y nuevas fuentes de datos.

El reconocimiento internacional de este proyecto confirma su relevancia. La obra MEMORY (DOUG_2) fue el primer modelo de inteligencia artificial incorporado a la colección permanente del Victoria and Albert Museum de Londres. Además, Chung ha recibido premios por su excelencia en la colaboración entre humanos y robots.

### 3.3. Investigación sobre expresión emocional y arte en la infancia

Durante la investigación del proyecto, una de las líneas que consideramos más importantes fue el papel del arte en la expresión emocional durante la infancia.

El arte en la infancia puede entenderse como un lenguaje emocional primario. Antes incluso de dominar la lectoescritura o de poder verbalizar sentimientos complejos, los niños utilizan el arte como forma natural de comunicación.

Esta capacidad expresiva es especialmente relevante, ya que muchas emociones infantiles no se comunican directamente con palabras. La expresión plástica puede actuar como una primera forma de alfabetización emocional: permite sacar fuera una emoción, darle una forma concreta y, posteriormente, facilitar que el niño pueda hablar sobre ella.

Desde una perspectiva psicopedagógica, las disciplinas artísticas pueden funcionar como herramientas que permiten acceder al mundo interno del niño de forma no invasiva. Mediante el trazo, la elección de colores, la presión ejercida sobre el papel, la repetición de formas o la ocupación del espacio, los niños pueden expresar aspectos de su mundo emocional de los que muchas veces no son plenamente conscientes.

Uno de los componentes más relevantes en el análisis del arte infantil es el color. Su elección puede relacionarse con la individualidad, la edad, las preferencias personales y el estado emocional del niño. En muchas propuestas educativas se utilizan asociaciones entre tonalidades y estados anímicos para ayudar a comprender emociones básicas.

La manera en que el niño trata la superficie del papel puede reflejar su temperamento, su energía o sus reacciones inmediatas ante el entorno. Por ejemplo, una presión muy intensa puede llegar incluso a rasgar el papel, mientras que trazos poco marcados pueden sugerir inseguridad, duda o menor energía expresiva. También se ha observado que, en algunas actividades prácticas, los niños tienden a utilizar la mancha para representar la tristeza, mientras que para emociones como el miedo o la frustración recurren con mayor frecuencia a la línea.


La repetición de trazos, formas o movimientos también puede tener un valor expresivo. Llenar una hoja con un mismo patrón, insistir en un gesto gráfico o repetir un color puede funcionar como una forma de comunicar sentimientos y liberar tensiones, miedos o ansiedades acumuladas.

Otro beneficio importante es el fortalecimiento de la autoestima. Cuando un niño crea algo propio, observa que su experiencia interna puede adquirir forma, color y presencia. La obra se convierte en una representación personal que puede compartir con otras personas si lo desea. Esto refuerza su identidad, su confianza y la percepción de que aquello que siente tiene valor.

### 3.4. Investigación sobre arte, autismo y comunicación emocional

El Trastorno del Espectro Autista (TEA) se define como un trastorno del desarrollo neuropsicológico caracterizado por dificultades persistentes en la comunicación y la interacción social, así como por patrones de comportamiento restrictivos y repetitivos. Desde una perspectiva clínica, el autismo puede implicar dificultades en la posibilidad de compartir, reconocer y experimentar emociones con los demás de manera espontánea. En este contexto, la arteterapia adquiere un papel relevante, como herramienta capaz de mediar en el mundo emocional de estas personas.

Uno de los principales desafíos en la población con TEA está relacionado con la alexitimia, término que describe la dificultad para identificar, procesar y expresar emociones de forma verbal. Esta dificultad puede hacer que algunas personas autistas no logren explicar con palabras lo que sienten, aunque sí puedan manifestarlo mediante gestos, conductas, respuestas sensoriales o producciones visuales.

Según las investigaciones de Hobson, antes de que un niño pueda comprender intelectualmente a los demás, debe establecer una “relación emocional”, un vínculo que en el TEA puede encontrarse alterado. Por ello, muchas intervenciones educativas y terapéuticas se centran en favorecer la expresión emocional, la regulación sensorial y la comunicación social mediante canales alternativos al lenguaje verbal.

La arteterapia se basa en el uso del proceso creativo como un canal de comunicación no verbal y alternativo. Esta metodología puede ser especialmente eficaz en personas autistas debido a su frecuente predominio del pensamiento visual y a sus capacidades de discriminación visoespacial. El proceso artístico permite que los sentimientos fluyan de una forma menos directa y menos condicionada por las exigencias del lenguaje verbal.

Además de facilitar la comunicación, el arte puede contribuir a la regulación sensorial. Las actividades artísticas permiten trabajar esta dimensión de forma progresiva y controlada.

La práctica artística también puede tener beneficios en el desarrollo cognitivo y psicomotriz como la concentración, la toma de decisiones, el seguimiento de instrucciones y la planificación.

Un ejemplo es el programa “Hablando con el Arte”, una iniciativa impulsada por la Fundación Orange y la Asociación Argadini. Este proyecto acerca a personas con TEA al arte y a los museos mediante visitas guiadas y creación artística posterior. Su idea central es que el arte puede servir como puente para la educación emocional, la comunicación y la inclusión social. Además, no se limita a observar obras, sino que los participantes las reinterpretan y producen sus propias piezas a partir de la experiencia.


También resulta relevante el enfoque de ARGADINI, un programa de educación emocional a través de la creatividad pensado para personas con discapacidad, incluido el autismo. Su planteamiento no se centra únicamente en la destreza plástica, sino en trabajar la dimensión socioafectiva mediante actividades artísticas, experiencias culturales y procesos de creación.

En conjunto, los programas de arteterapia en contextos educativos, las iniciativas culturales y los programas sensoriales e inclusivos para TEA comparten una misma base: el arte no se utiliza solo para “hacer manualidades”, sino como un medio para expresar emociones, mejorar la comunicación, favorecer la autorregulación y promover la inclusión. La diferencia principal está en el contexto (museo, aula, terapia o taller sensorial), pero todos dan prioridad al proceso creativo por encima del resultado

final.

## 4. Presentación de la solución robótica

### 4.1. Objetivo y funcionamiento general

Inner Synergy es una solución robótica de cocreación artística que permite transformar señales emocionales en una obra pictórica realizada por un brazo robótico. El proyecto está pensado especialmente para niños de edades tempranas y personas autistas o con otras necesidades de apoyo en la comunicación emocional, aunque también puede ser utilizado por cualquier persona que quiera expresar su mundo interior mediante el arte.

La idea principal del proyecto es que el usuario no tenga que explicar directamente cómo se siente con palabras. En su lugar, el sistema analiza su expresión facial durante un periodo de tiempo y utiliza esa información para generar una pintura personalizada. De esta manera, el arte se convierte en un canal alternativo de expresión emocional, más visual, accesible y creativo.

El proyecto integra robótica, inteligencia artificial y arte para crear una experiencia en la que intervienen tres elementos principales: la persona, que aporta sus señales emocionales; el sistema inteligente, que interpreta la información y la transforma en instrucciones artísticas; y el brazo robótico, que ejecuta la obra sobre un formato físico. El resultado final es una pintura en tamaño A4 que representa, de forma abstracta, la combinación entre las emociones detectadas y el estilo pictórico elegido por el usuario.

El funcionamiento de Inner Synergy comienza con Moodcam, una aplicación que analiza la expresión facial del usuario. Durante el tiempo de análisis, el sistema identifica las emociones predominantes y obtiene como resultado las dos emociones principales, expresadas en porcentaje. Esta información constituye la base emocional de la obra artística que se generará posteriormente.

Una vez obtenidos los datos emocionales, la información se envía mediante HiveMQ, que actúa como sistema de comunicación entre las distintas partes del proyecto. A partir de este punto, el usuario puede seleccionar el estilo pictórico con el que desea desarrollar su obra.

El sistema combina entonces dos tipos de información. Por un lado, las emociones predominantes determinan los dos colores principales que se utilizarán en la pintura. Por otro lado, el estilo pictórico elegido define el tipo de trazos, patrones o movimientos que realizará el brazo robótico. De esta forma, una misma emoción puede producir resultados diferentes según el artista seleccionado, y un mismo estilo puede variar en función del estado emocional detectado.


A partir de esta combinación, se generan las instrucciones que controlan el brazo robótico. Estas instrucciones indican cómo debe moverse, qué tipo de trazo debe realizar y cómo debe organizar la pintura sobre el papel. Finalmente, el brazo robótico ejecuta la obra de manera autónoma y produce una pintura en formato A4.

En Inner Synergy, el usuario no es un espectador pasivo. Su participación es esencial, ya que son sus propias señales emocionales las que determinan una parte fundamental de la obra final. La pintura no se genera de forma aleatoria ni reproduce siempre el mismo patrón, sino que depende de la información emocional obtenida durante la interacción con Moodcam y de la elección del estilo pictórico.

Esta participación convierte la experiencia en un proceso de cocreación. El usuario aporta su mundo interior, la inteligencia artificial interpreta los datos emocionales y artísticos, y el brazo robótico transforma esa información en una creación visual. Por tanto, la obra final no pertenece únicamente al robot ni al sistema, sino que surge de la colaboración entre la persona y la tecnología.

### 4.2. Caso de uso: experiencia artística guiada y referentes pictóricos

Además, el proyecto prevé que la experiencia no termine mientras el brazo robótico está pintando. Durante el tiempo de creación de la obra, el usuario podrá seguir interactuando con la tecnología mediante recursos audiovisuales relacionados con el artista escogido. También se plantea la posibilidad de acceder a una experiencia de realidad virtual basada en una de sus obras, de manera que el usuario pueda aprender más sobre el referente artístico seleccionado mientras observa cómo su propia pintura está siendo creada.

De esta forma, Inner Synergy combina expresión emocional, aprendizaje artístico e interacción tecnológica. El usuario no solo obtiene una pintura final, sino que participa en una experiencia completa donde sus emociones, su elección artística y la acción del robot se unen para convertir su mundo interior en arte.

### 4.3. Decisiones autónomas y supervisión humana

Inner Synergy estima emociones, combina parámetros visuales y genera directivas de color, densidad y gesto según el artista elegido. El generador local transforma esas directivas en trayectorias limitadas para el lienzo A4. La persona participante elige el referente artístico; el operador calibra el brazo, supervisa su movimiento y puede detenerlo; y la voz solo se activa con consentimiento explícito. La IA no recibe control de coordenadas físicas, límites de servos ni comandos directos del robot.

### 4.4. Diagrama general de funcionamiento

```text
Persona + selección de artista
			|
			v
Moodcam en navegador -> datos emocionales derivados -> MQTT -> AI Bridge
			|                                               |
			|                                               v
			+---------------- estado y chunks <----- directivas artísticas
															|
															v
											 ESP32 + brazo robótico -> pintura A4
```

#### Referentes pictóricos seleccionados

##### Wassily Kandinsky: color, forma y mundo interior

Wassily Kandinsky ha sido seleccionado como uno de los referentes pictóricos porque su obra establece una relación directa entre arte abstracto, emoción y mundo interior. Para Kandinsky, la pintura no debía limitarse a imitar la realidad visible, sino convertirse en una forma de expresar la vida interior del artista y provocar una respuesta emocional en el espectador.

Uno de los conceptos centrales de su teoría estética es la necesidad interior. Según Kandinsky, una verdadera obra de arte nace del impulso interno del artista y de la necesidad de comunicar aquello que no siempre puede expresarse con palabras.


Kandinsky atribuía a los colores una “vibración” anímica. En su teoría,el amarillo se relaciona con lo expansivo, activo, enérgico e incluso agresivo; el azul con la profundidad, la calma, la espiritualidad y el recogimiento; el rojo con la fuerza, la pasión y la energía; el violeta con el misterio, la melancolía y la introspección; el blanco con el silencio, el comienzo y la esperanza; y el negro con la ausencia, el cierre o la finitud.

La forma también tiene un papel esencial en su lenguaje visual. El triángulo suele asociarse con dinamismo, tensión y aspereza visual; el círculo con estabilidad, plenitud y espiritualidad; y el cuadrado con solidez, equilibrio y fuerza contenida. De esta manera, un triángulo amarillo intensifica la sensación de energía o agresividad, mientras que un círculo azul potencia la calma y la profundidad espiritual.

Otro elemento importante en su obra es la densidad visual. Las composiciones con acumulación de formas generan una sensación más activa, intensa o dramática. En cambio, las composiciones con menos elementos y mayor espacio visual, transmiten calma, silencio o contemplación.

##### Alma Thomas: ritmo, luz y celebración del color

Alma Thomas ha sido seleccionada como uno de los referentes pictóricos porque su obra ofrece una visión de la abstracción profundamente ligada a la alegría, la naturaleza y la energía positiva del color. Esta perspectiva resulta especialmente valiosa para nuestro proyecto, ya que permite asociar determinadas emociones con una experiencia artística más amable, vibrante y accesible.


Uno de los rasgos más distintivos de su obra es el uso del color como portador de emoción positiva. Thomas afirmó: “A través del color he buscado concentrarme en la belleza y la felicidad en mi pintura, en lugar de en la inhumanidad del hombre hacia el hombre”. En sus composiciones, los tonos vivos y contrastados no producen agresividad, sino vitalidad, optimismo y celebración.

Su estilo maduro se caracteriza por las conocidas “Rayas de Alma”, una técnica basada en pequeñas pinceladas rectangulares e irregulares dispuestas de forma rítmica sobre el lienzo. Estas pinceladas suelen organizarse en columnas, patrones curvos o círculos concéntricos, generando una imagen que recuerda a los mosaicos, los vitrales o el puntillismo. Un elemento fundamental en esta técnica es el uso del espacio negativo. Thomas dejaba pequeños espacios entre las pinceladas para que el fondo blanco del lienzo pudiera “respirar”.

Además, su trayectoria como maestra durante treinta y cinco años en la Shaw Junior High School refuerza su conexión con nuestro proyecto, orientado en buena parte a la infancia. De hecho, Alma Thomas llegó a afirmar: “La gente siempre me quiere citar por mis pinturas de colores, pero prefiero ser recordada por haber ayudado a poner los fundamentos de las vidas de los niños”.

##### Jackson Pollock: gesto, energía y pintura en acción

Jackson Pollock ha sido seleccionado como referente pictórico por su manera de entender la pintura como acción, movimiento y exteriorización emocional. Su técnica del dripping transforma el lienzo en un espacio de gesto físico, ritmo e intensidad.

Durante su etapa de madurez, abandonó el caballete tradicional y comenzó a colocar el lienzo directamente sobre el suelo. La pintura ya no se aplicaba únicamente con pincel, sino que se dejaba caer, se salpicaba o se vertía sobre la superficie. Este método convierte el lienzo en una “arena de acción”, donde el ritmo, la velocidad y la densidad de los trazos reflejaban el estado anímico del artista.


Uno de los rasgos más característicos de sus composiciones es el formato all-over, en el que no existe un centro visual único ni una jerarquía clara entre las partes del cuadro. Las líneas, salpicaduras y cruces ocupan toda la superficie.

Aunque a primera vista muchas obras de Pollock pueden parecer caóticas, su trabajo no se basa en el azar absoluto. La acumulación de trazos puede transmitir tensión, conflicto o agitación, pero también ritmo, expansión y vitalidad.

##### Mark Rothko: campos de color, silencio y contemplación emocional

Mark Rothko ha sido seleccionado como referente pictórico porque su obra lleva la abstracción hacia una experiencia profundamente emocional y contemplativa. Rothko construye sus pinturas a partir de grandes campos de color que buscan envolver al espectador y provocar una respuesta íntima. Su obra no pretende representar objetos ni escenas, sino generar un espacio de reflexión interior.

Su interés principal era la capacidad del color para expresar emociones humanas básicas como la tragedia, el éxtasis, la fatalidad, el recogimiento o la introspección.

Durante su etapa más reconocible, Rothko desarrolló un lenguaje basado en dos o tres grandes rectángulos de color. Al utilizar lienzos de gran formato, buscaba “envolver” al espectador y reducir la distancia entre la persona y la obra.

El color en Rothko actúa como un espacio emocional. Los rojos, naranjas y amarillos suelen transmitir calor, intensidad, vitalidad o exaltación; los azules, violetas y verdes oscuros pueden asociarse con introspección, melancolía, misterio o calma profunda; y los negros o tonos muy apagados tienden a expresar gravedad, duelo o tensión existencial.


## 5. Desarrollo técnico del prototipo

### 5.1. Moodcam y detección emocional

Moodcam es el módulo encargado de iniciar la experiencia de Inner Synergy. Su función principal es analizar la expresión facial del usuario y obtener una lectura emocional que posteriormente se utilizará para generar la obra artística. Esta parte del sistema es esencial, ya que transforma la interacción inicial de la persona en datos que pueden ser interpretados por el resto de la solución robótica.

En las primeras fases del proyecto, Moodcam funcionaba mediante una API externa. Sin embargo, al evolucionar hacia una plataforma web, el equipo decidió integrar la detección directamente en el navegador. Esta decisión permite que el análisis se realice de forma local en el dispositivo del usuario, sin necesidad de enviar imágenes o vídeo a un servidor externo. De esta manera, el sistema mejora la privacidad y reduce la dependencia de servicios externos durante la captura emocional.

Para la parte de inteligencia artificial y visión por computador utiliza la librería @vladmandic/human, que trabaja sobre TensorFlow.js y permite ejecutar modelos de aprendizaje automático directamente en el navegador. Los modelos utilizados se cargan desde la propia aplicación y permiten detectar el rostro, identificar puntos faciales y clasificar la emoción predominante.

El proceso comienza cuando el usuario inicia la cámara desde la interfaz web. En ese momento, la aplicación solicita permiso para acceder a la webcam y activa la cámara frontal. Una vez que el vídeo empieza a reproducirse, se ejecuta un bucle de detección, lo que permite adaptar la velocidad de análisis al rendimiento del dispositivo.

En cada ciclo de detección, el sistema procesa la imagen de la cámara mediante varios modelos. Finalmente, el modelo de emociones analiza la expresión facial detectada y asigna valores de confianza a diferentes emociones.

Moodcam clasifica siete posibles estados emocionales: felicidad, tristeza, enfado, sorpresa, miedo, disgusto y calma. Cada emoción se representa mediante una puntuación de confianza entre 0 y 1, que puede interpretarse como un porcentaje.


Además, la interfaz muestra la emoción dominante y las puntuaciones asociadas, de manera que el usuario y el equipo pueden observar la evolución de la detección en tiempo real.

Una decisión importante de diseño fue limitar la detección a un solo rostro. En nuestro caso, el objetivo es analizar al usuario que está participando en la experiencia, por lo que procesar únicamente una cara mejora el rendimiento y evita interferencias con otras personas que puedan aparecer en segundo plano. También se aplica un efecto espejo al vídeo y al canvas para que la cámara se comporte de forma más natural para el usuario.

Para obtener una información más útil para la creación artística, Moodcam no se queda solo con una lectura instantánea. La duración inicial de la sesión es de 30 segundos y puede configurarse. Durante la captura se toman muestras faciales aproximadamente cada 650 ms. Cada 5 segundos la aplicación resume la ventana reciente y la usa para actualizar la obra; al finalizar conserva un resumen compatible de toda la sesión. Las emociones se ordenan por peso relativo para orientar la propuesta artística.

Esta salida emocional es la información que después se envía al resto del sistema. Las dos emociones predominantes y sus porcentajes permiten decidir los colores principales de la pintura, mientras que el estilo pictórico elegido por el usuario define el tipo de trazo que realizará el brazo robótico. De esta manera, Moodcam actúa como el primer puente entre la persona y la creación artística: convierte una expresión facial en datos emocionales que pueden transformarse en color, movimiento y pintura.

### 5.2. Comunicación mediante HiveMQ

Para conectar las distintas partes, el proyecto utiliza comunicación mediante MQTT a través de HiveMQ. MQTT es un protocolo de mensajería ligero muy utilizado en sistemas IoT, ya que permite enviar información entre diferentes dispositivos o programas de forma rápida y organizada. En nuestro caso, se utiliza para comunicar la aplicación web, el módulo de inteligencia artificial y el brazo robótico.

HiveMQ actúa como broker MQTT, es decir, como punto intermedio encargado de recibir mensajes y distribuirlos a los componentes que estén suscritos al canal correspondiente. Esto evita que todos los elementos del sistema tengan que estar conectados directamente entre sí. La aplicación web no necesita comunicarse de forma directa con el brazo robótico, sino que publica los datos en HiveMQ; después, los módulos que necesitan esa información la reciben desde el broker.

Esta arquitectura permite separar el sistema en partes independientes. Por un lado, Moodcam analiza la expresión facial del usuario desde la web y genera los datos emocionales. Por otro lado, el AI Bridge recibe esos datos y los transforma en una decisión artística. Finalmente, la parte física del proyecto, basada en ESP32/Arduino, recibe las instrucciones de movimiento y las ejecuta mediante el brazo robótico.

La comunicación se organiza mediante topics, que funcionan como canales de información. Cada topic identifica el tipo de mensaje que se está enviando. Una decisión técnica importante ha sido utilizar un identificador de dispositivo, denominado deviceId, como base de los topics. Esto permite aislar cada sesión o prototipo, evitando que los mensajes de un dispositivo se mezclen con los de otro. Esta


organización sería especialmente útil si en el futuro hubiera varios brazos robóticos funcionando al mismo tiempo, ya que cada uno podría comunicarse dentro de su propio espacio de mensajes.

Los mensajes enviados no contienen imágenes ni audio. Únicamente se transmiten datos procesados. Con voz aceptada de forma explícita, se puede transmitir una transcripción temporal al módulo de decisión para orientar la intención artística. Cuando OpenAI está configurado, puede recibir fragmentos recientes de esa transcripción; la aplicación no conserva esos datos al terminar la sesión.

La estructura de los mensajes se basa en formato JSON, ya que permite organizar la información de manera clara y fácil de interpretar por todos los módulos.

Otro aspecto importante es la seguridad y la coherencia de los datos. El proyecto utiliza un contrato de mensajería compartido para que la web, el AI Bridge y el firmware interpreten los mensajes de la misma manera. Esto reduce errores de comunicación, ya que todos los componentes esperan una estructura de datos común.

La comunicación entre los distintos módulos se basa en estructuras de datos en formato JSON. En nuestro proyecto, el JSON actúa como un lenguaje común entre las partes del sistema. Moodcam genera datos emocionales a partir de la expresión facial del usuario; HiveMQ transporta esos datos mediante MQTT; el AI Bridge los interpreta y los convierte en decisiones artísticas; y, finalmente, el sistema físico utiliza esas decisiones para generar movimientos en el brazo robótico.

La estructura en JSON es una parte fundamental del sistema. No solo sirve para enviar información, sino que permite transformar progresivamente una expresión facial en una obra física: primero como datos emocionales, después como resumen de emociones, más tarde como plan artístico y finalmente como instrucciones para el brazo robótico. Gracias a esta organización, Inner Synergy puede convertir el mundo interior del usuario en decisiones técnicas que el robot ejecuta sobre el papel.

### 5.3. Generación de instrucciones artísticas

Una vez obtenidos los datos emocionales del usuario y seleccionado el referente pictórico, el sistema debe transformar esa información en un conjunto de decisiones visuales y, posteriormente, en instrucciones que el brazo robótico pueda ejecutar.

En nuestro sistema, la alegría se asocia principalmente con colores como el amarillo y el naranja, así como con una alta densidad visual. La calma se relaciona con el azul y con una baja densidad visual. La tensión o la rabia se traducen en rojos y en una muy alta densidad visual, mientras que la melancolía o la tristeza se representan mediante violetas y una baja densidad visual.

Además del color, el sistema también utiliza relaciones entre emoción y forma. Los trazos triangulares o en punta se vinculan con emociones como la tensión y, en algunos casos, la alegría. Las curvas se relacionan con la estabilidad, la plenitud o una experiencia emocional más equilibrada. El cuadrado se asocia a la calma y a una sensación de estructura más estable.

Otro parámetro importante es la densidad visual, entendida en el proyecto como el número de trazos que realizará el brazo robótico al pintar. Una emoción con mayor intensidad puede producir una obra más cargada. En cambio, una emoción más serena puede generar una composición más abierta y con


menos intervención. De esta manera, la densidad se convierte en una variable cuantificable que el sistema puede traducir en acciones físicas.

| Señal orientativa | Colores predominantes | Densidad | Forma o trazo |
| --- | --- | --- | --- |
| Alegría | Amarillo y naranja | Alta | Trazos expansivos y en punta |
| Calma | Azul | Baja | Curvas, cuadrados y composición ordenada |
| Tensión o rabia | Rojo | Muy alta | Puntas y diagonales |
| Melancolía o tristeza | Violeta | Baja | Curvas suaves y formas abiertas |

Cada referente pictórico se traduce en una forma distinta de construir la obra:

| Artista | Traducción robótica del estilo |
| --- | --- |
| Pollock | Trazos gestuales y salpicaduras controladas sobre el papel |
| Alma Thomas | Líneas discontinuas repetitivas organizadas como patrones rítmicos |
| Rothko | Campos de color amplios, pausados y ordenados |
| Kandinsky | Círculos, triángulos y líneas geométricas |

A partir de estas reglas, el sistema genera un plan artístico que ya puede transformarse en instrucciones técnicas. Este plan define cuántos trazos deben realizarse, con qué color, en qué orden, con qué forma general y con qué nivel de densidad. Después, esta información se convierte en una estructura de comandos que el brazo robótico puede interpretar, respetando las limitaciones físicas del soporte, el tamaño A4 y el rango de movimiento de las articulaciones.

El sistema incorpora también un cierto grado de variación para evitar que las obras sean siempre idénticas. Aunque las reglas generales se mantienen, algunos parámetros pueden modificarse dentro de unos límites controlados. Esto permite que cada pintura sea distinta, aunque parta de una misma lógica emocional y artística.

### 5.4. Construcción del brazo robótico

El objetivo era diseñar un sistema capaz de transformar las instrucciones generadas por el proyecto en movimientos reales sobre un soporte de pintura. Para ello, el equipo siguió un proceso progresivo basado en diseño, fabricación, prueba y mejora del prototipo.

En primer lugar, se diseñó, imprimió en 3D y construyó un primer prototipo de menor tamaño. Esta versión inicial tenía como finalidad analizar el funcionamiento, comprobar la relación entre las articulaciones y observar cómo respondían los servomotores ante movimientos básicos.


Después de esta primera fase, el equipo redimensionó el brazo robótico teniendo en cuenta el objetivo real del proyecto: pintar sobre un soporte de tamaño A4 colocado en horizontal. También se decidió que la herramienta de pintura sería un pincel, por lo que fue necesario adaptar el extremo del brazo para sujetarlo correctamente y permitir que entrara en contacto con la superficie de trabajo.

El brazo robótico se diseñó como una estructura articulada fabricada mediante impresión 3D. Las piezas impresas forman la base, los segmentos del brazo y el soporte final del pincel, integrando los servomotores encargados de generar el movimiento.


Además del brazo, el equipo diseñó una zona de trabajo específica para la creación de la obra. Esta zona está pensada para fabricarse con metacrilato cortado mediante cortadora láser. La base incorpora una carcasa para alojar y proteger la parte inferior del brazo robótico, mejorando la estabilidad del conjunto y ordenando los elementos mecánicos y electrónicos.

#### Diseño de la zona de trabajo

Se han previsto casilleros para colocar recipientes con agua y otros compartimentos para los colores que utilizará el robot. En la versión planteada, el sistema trabaja con cuatro colores disponibles.

### 5.5. Programación y control con Arduino

El control físico del brazo robótico se realiza mediante una placa ESP32/Arduino, encargada de ejecutar los movimientos. Esta parte del sistema actúa como el puente final entre la información digital generada por la web y la acción física del robot.

El brazo cuenta con cuatro articulaciones principales: base, hombro, codo y muñeca. Cada una de ellas está controlada mediante un servomotor, lo que permite modificar la posición del brazo en diferentes ejes y orientar el pincel sobre la zona de trabajo.

Durante el desarrollo se decidió utilizar servomotores de 180º en lugar de servomotores de 360º. Esta decisión fue importante porque los servomotores de 180º permiten trabajar con posiciones angulares concretas, lo que facilita el control de cada articulación.

El programa cargado en la placa interpreta las instrucciones recibidas y las convierte en posiciones para los servomotores. Estas instrucciones proceden del plan artístico generado por el sistema y pueden indicar movimientos como realizar un trazo, cambiar la dirección, desplazarse a una zona concreta del


papel o modificar la velocidad de ejecución. El firmware traduce estas órdenes en valores angulares para cada articulación, teniendo en cuenta los límites mecánicos del brazo.

Una parte fundamental del control es la calibración. Antes de ejecutar una obra, el brazo debe situarse en una posición inicial conocida. Esta posición sirve como punto de referencia para que el sistema sepa desde dónde empieza cada trayectoria. A partir de este punto, los movimientos se realizan de forma controlada, evitando desplazamientos bruscos o posiciones que puedan forzar la estructura mecánica. El firmware también incorpora límites de seguridad para cada articulación.

En conjunto, el control con Arduino/ESP32 permite que Inner Synergy convierta los datos emocionales y artísticos en movimientos físicos. La placa recibe instrucciones generadas a partir de la emoción detectada y del estilo pictórico elegido, las transforma en posiciones de servomotores y coordina las articulaciones para pintar sobre el papel. Gracias a este control, el brazo robótico no actúa como una máquina que repite siempre el mismo movimiento, sino como un sistema capaz de ejecutar diferentes trazos según la información recibida.

### 5.6. Fotografías y planos del prototipo

### 5.7. Pruebas técnicas, dificultades y mejoras

El desarrollo técnico del prototipo se ha basado en un proceso progresivo de prueba, error y mejora continua. Tanto la parte digital como la parte física del proyecto han sido diseñadas, programadas y ajustadas por el equipo de forma principalmente autodidacta, combinando investigación propia, consulta de documentación técnica, pruebas prácticas y orientación puntual de expertos.

Muchas decisiones iniciales tuvieron que modificarse después de comprobar su funcionamiento real. Por este motivo, el proyecto fue evolucionando en distintas fases: primero se desarrollaron versiones simples para validar la idea, después se añadieron nuevas funciones y, finalmente, se integraron los diferentes sistemas para que pudieran trabajar de forma coordinada.

En el caso de Moodcam, el desarrollo comenzó con un modelo sencillo de detección emocional. En las primeras pruebas, el objetivo principal era comprobar si la cámara podía reconocer un rostro y devolver una emoción dominante. Una vez validada esta parte, la web incorporó visualización en tiempo real, puntuaciones de confianza, muestras periódicas, ventanas de 5 segundos, selección de emociones predominantes y comunicación con el resto del sistema. Este crecimiento progresivo permitió mejorar la estabilidad de la detección y adaptar la información emocional a las necesidades del proyecto artístico.

La programación del brazo comenzó de manera muy básica. En una primera fase, el equipo programó manualmente algunos trazos concretos para comprobar que los servomotores respondían correctamente y que el pincel podía desplazarse sobre el papel. Estos trazos iniciales eran limitados, pero permitieron validar la relación entre el código, los ángulos de los motores y el resultado físico sobre el soporte.


Posteriormente, se introdujo la randomización de trazos. Esta mejora fue importante porque permitió que el robot no repitiera siempre el mismo dibujo. A partir de un conjunto de movimientos previamente definidos, el sistema podía variar ciertos parámetros para generar obras diferentes en cada ejecución. Esto hizo que el resultado se acercará más a la idea de cocreación artística, ya que cada pintura podía tener una composición distinta aunque partiera de una misma estructura técnica.

Después de esta fase, el equipo empezó a trabajar con más de un estilo pictórico. Esto supuso una dificultad añadida, ya que cada referente artístico requería un tipo de movimiento diferente. Por ejemplo, un estilo inspirado en Pollock necesita trazos más gestuales y dinámicos, mientras que un estilo inspirado en Rothko requiere movimientos más amplios, pausados y organizados en campos de color. Esta comparación permitió ver que no bastaba con mover el brazo de forma aleatoria, sino que era necesario adaptar los movimientos al lenguaje visual de cada artista.

A medida que avanzaban las pruebas, el equipo detectó una nueva necesidad técnica: trabajar con cinemática inversa. Al principio, los movimientos se planteaban a partir de ángulos definidos manualmente para cada servo. Sin embargo, este método se volvió limitado cuando se necesitaba que el pincel alcanzara posiciones concretas dentro del papel. La cinemática inversa permite plantear el problema al revés: en lugar de indicar directamente los ángulos de cada motor, se define una posición objetivo en el espacio de trabajo y el sistema calcula qué ángulos necesita cada articulación para llegar hasta ese punto. Esta mejora resulta fundamental para aumentar la precisión y la flexibilidad del brazo.

La parte más compleja del proyecto ha sido la programación y, especialmente, la integración de todos los sistemas.

Durante este proceso surgieron diferentes problemas técnicos: lecturas emocionales inestables,errores en la estructura de datos, problemas de comunicación entre módulos, movimientos poco precisos del brazo y limitaciones mecánicas del prototipo. Cada uno de estos problemas obligó al equipo a revisar decisiones, modificar código, rediseñar piezas o cambiar la forma de ejecutar las pruebas.

La consulta a expertos también fue importante durante el desarrollo. Aunque el trabajo de construcción y programación ha sido realizado por el equipo, recibir orientación externa ayudó a comprender mejor algunos conceptos técnicos, detectar errores de planteamiento y tomar decisiones más seguras. Este acompañamiento no sustituyó el trabajo del equipo, sino que sirvió como guía en un proceso de aprendizaje principalmente autónomo.


## 6. Impacto social, innovación y emprendimiento

### 6.1. Personas beneficiarias y necesidad abordada

Inner Synergy está pensado principalmente para niños de edades tempranas y para personas autistas o con otras necesidades de apoyo en la comunicación emocional. Sin embargo, su utilidad puede ampliarse a cualquier persona que tenga dificultades para expresar lo que siente mediante palabras o que pueda beneficiarse de una experiencia artística, visual e interactiva.

Los principales beneficiarios del proyecto serían:

- Niños de edades tempranas: Expresar emociones mediante colores, trazos y formas cuando todavía no pueden explicarlas con claridad.

- Niños autistas o con necesidades de apoyo comunicativo: Disponer de una actividad visual, estructurada y creativa para facilitar la expresión emocional.

- Centros educativos: Trabajar emociones, arte, tecnología e inclusión en una misma experiencia.

- Familias: Obtener una herramienta lúdica para iniciar conversaciones sobre emociones.

- Docentes y profesionales de apoyo: Observar cómo el usuario participa en un proceso creativo y cómo responde a una experiencia artística guiada por tecnología.El proyecto no pretende sustituir el trabajo de familias, docentes, terapeutas o profesionales especializados. Su objetivo es funcionar como una herramienta complementaria, accesible y motivadora, que ayude a abrir nuevas vías de expresión y diálogo emocional.

### 6.2. Impacto social y educativo

El principal impacto social está relacionado con la inclusión y la expresión emocional. La solución permite que una persona transforme señales de su mundo interior en una obra artística física, sin necesidad de explicar directamente lo que siente con palabras.

La experiencia propuesta por el proyecto puede ayudar a que el usuario se sienta protagonista de una creación. Al ver que aquello que siente puede convertirse en color, forma y movimiento, el usuario puede reconocer que su experiencia interna tiene valor y puede ser compartida con los demás.

En el ámbito educativo, puede utilizarse para trabajar diferentes dimensiones del aprendizaje. Permite abordar la educación emocional, introduce contenidos artísticos a través de referentes e incorpora tecnología, programación, inteligencia artificial, robótica y diseño, lo que lo convierte en una propuesta interdisciplinar. El proyecto también puede favorecer la autoestima. La obra final no es un dibujo generado de forma aleatoria ni una pintura impersonal, sino el resultado de la interacción entre el usuario y el sistema.

Otro impacto importante es la posibilidad de crear espacios más inclusivos. Al tratarse de una actividad visual y artística, puede adaptarse a diferentes perfiles de usuario. No exige grandes conocimientos previos ni una explicación verbal compleja. El usuario solo necesita participar en la experiencia, elegir un estilo pictórico y observar cómo sus señales emocionales influyen en la obra final. Esto permite que personas con distintas capacidades puedan formar parte de una misma actividad cultural y tecnológica.

Un posible caso de uso de Inner Synergy sería su aplicación en un centro educativo durante una actividad de educación emocional y arte.

### 6.3. Inclusión, privacidad y límites de uso

Aunque Inner Synergy tiene un objetivo social positivo, también es importante reconocer sus limitaciones. La primera es que el sistema no diagnostica emociones. Moodcam analiza señales faciales y ofrece una estimación basada en un modelo de inteligencia artificial, pero no puede saber con certeza lo que siente una persona.

Otra limitación está relacionada con la privacidad. Aunque Moodcam procesa la imagen en el navegador y no necesita enviar vídeo a un servidor, es fundamental que cualquier uso del sistema se realice con consentimiento y supervisión adulta.

También pueden existir limitaciones técnicas. La detección emocional puede variar según la iluminación, la posición del rostro, la calidad de la cámara o el rendimiento del dispositivo. Además, el brazo robótico puede presentar pequeñas imprecisiones mecánicas, especialmente al trabajar con pintura real, agua y pinceles.

Desde el punto de vista inclusivo, también es importante evitar que la experiencia resulte invasiva. Algunos niños pueden sentirse incómodos con una cámara, con el movimiento del robot o con determinados estímulos visuales.

### 6.4. Innovación de la propuesta

La innovación principal de Inner Synergy está en combinar detección emocional, inteligencia artificial, referentes artísticos y robótica física dentro de una misma experiencia de cocreación. El proyecto no se limita a crear un robot que pinta, sino que propone un sistema en el que la obra final depende de la interacción del usuario. A diferencia de otros robots artísticos que ejecutan patrones predefinidos o reproducen imágenes, Inner Synergy utiliza las señales emocionales detectadas para tomar decisiones sobre la obra. Esto hace que cada obra sea diferente.

Otro elemento innovador es la conexión entre arte y accesibilidad emocional. También resulta innovadora la integración de varias capas tecnológicas.

### 6.5. Contribución a los Objetivos de Desarrollo Sostenible

Inner Synergy puede relacionarse con varios Objetivos de Desarrollo Sostenible, especialmente por su enfoque educativo, inclusivo y tecnológico. Se vincula con el ODS 4, ODS 10: Reducción de las desigualdades y ODS 9: Industria, innovación e infraestructura.

### 6.6. Mejoras y evolución técnica

El prototipo actual permite validar la idea principal del proyecto, pero también ha permitido identificar posibles mejoras para futuras versiones. Una de las mejoras más importantes sería perfeccionar la cinemática inversa del brazo robótico, con el objetivo de aumentar la precisión de los movimientos y facilitar que el pincel alcance posiciones concretas dentro del papel. También sería interesante ampliar el sistema de colores. Otra mejora sería optimizar la limpieza automática del pincel. A nivel de software, se podría mejorar la estabilidad de la detección emocional y adaptar los parámetros a diferentes perfiles de usuario. También se podrían incorporar más recursos audiovisuales o experiencias de realidad virtual relacionadas con los artistas seleccionados, reforzando la dimensión educativa del proyecto.

### 6.7. Viabilidad y posibles contextos de aplicación

En el futuro, Inner Synergy podría ampliarse con nuevos estilos pictóricos, más opciones de personalización, modos de uso para aulas o talleres, y versiones adaptadas a diferentes edades o necesidades de apoyo. También podría incluir un sistema de registro de obras generadas, siempre respetando la privacidad y el consentimiento de los usuarios.


Aunque Inner Synergy es actualmente un prototipo educativo, podría evolucionar hacia una solución aplicable en distintos contextos. Su posible desarrollo futuro podría orientarse a centros educativos, museos, centros de educación especial, asociaciones relacionadas con el autismo, talleres de arteterapia o espacios de innovación cultural.

Desde un punto de vista empresarial, el proyecto podría plantearse como una experiencia educativa y tecnológica, más que como un producto aislado. Es decir, no se trataría únicamente de vender un brazo robótico, sino de ofrecer una actividad completa que combina arte, emociones, inteligencia artificial y robótica.

Una posible versión del proyecto podría incluir el brazo robótico, la plataforma web, los recursos artísticos, el sistema de detección emocional, los materiales de pintura y una guía de uso para docentes o profesionales. También podría ofrecerse como taller temporal en colegios, museos o ferias de ciencia y tecnología.

Los posibles socios clave podrían ser colegios, centros de educación especial, asociaciones de familias de personas autistas, museos con programas educativos, universidades, ayuntamientos o entidades que promuevan la inclusión mediante la tecnología y el arte.

En cuanto a la sostenibilidad económica, el proyecto podría financiarse mediante talleres educativos, colaboraciones con instituciones culturales, subvenciones de innovación educativa, programas de inclusión social o patrocinios tecnológicos. También podría desarrollarse una versión modular para que otros centros pudieran construir o adaptar su propio prototipo.

### 6.8. Síntesis del impacto

El impacto de Inner Synergy no se basa únicamente en el resultado final de la pintura, sino en todo el proceso que permite llegar a ella. La experiencia combina emoción, arte y tecnología para ofrecer una forma diferente de comunicación. El usuario participa desde el inicio, elige un estilo pictórico, aporta señales emocionales y observa cómo un robot transforma esa información en una obra física.

El proyecto tiene valor social porque propone una herramienta inclusiva para expresar emociones de forma visual y creativa. Tiene valor educativo porque permite trabajar arte, inteligencia artificial, robótica y educación emocional en una misma actividad. Y tiene valor innovador porque convierte una interacción humana en una creación artística mediante un sistema robótico autónomo.

Por todo ello, Inner Synergy resume su propósito en su nombre y eslogan: crear una sinergia entre el mundo interior de la persona y la tecnología para convertirlo en arte.

### 6.9. Declaración del uso de inteligencia artificial

Inner Synergy utiliza inteligencia artificial en dos etapas diferenciadas. Moodcam ejecuta en el navegador modelos preentrenados de visión por computador mediante `@vladmandic/human` y TensorFlow.js para estimar señales de expresión facial. Esta estimación no diagnostica emociones ni identifica un estado interno con certeza; solo aporta una señal para la experiencia artística.

El AI Bridge puede utilizar OpenAI para transformar el resumen emocional, el artista elegido y, cuando existe consentimiento de voz, fragmentos recientes de la transcripción en directivas artísticas acotadas. OpenAI no genera coordenadas, puntos, límites de servos ni comandos directos para el brazo. La geometría, los límites del lienzo A4 y las comprobaciones físicas permanecen en lógica local validada. Si OpenAI no está configurado o falla, el sistema dispone de un generador local de respaldo para las directivas artísticas; la captura de voz se mantiene desactivada cuando OpenAI no está disponible.

La voz es opcional y requiere consentimiento explícito. Si se activa, la transcripción temporal puede enviarse a OpenAI para ayudar a crear la obra; la aplicación no envía ni conserva audio o vídeo, y no almacena imágenes, transcripciones ni resúmenes emocionales al finalizar la sesión.

Las decisiones humanas del equipo incluyen la selección de artistas, el mapeo de señales a parámetros visuales, los límites de seguridad del brazo y el diseño de la experiencia de consentimiento. No se han reentrenado modelos con datos de participantes ni se utiliza aprendizaje continuo durante las sesiones.

## 7. Lista de fuentes

### 7.1. Documentos y normativa WRO consultados

- World Robot Olympiad. *WRO 2026 Future Innovators General Rules*. Documento oficial conservado en el repositorio del proyecto.

### 7.2. Páginas web y fuentes de investigación

Las referencias de investigación artística, educativa y técnica se incorporarán en formato APA simplificado antes de la entrega final, indicando autor o entidad, título, fecha, URL y fecha de consulta.

### 7.3. Expertos, docentes o personas entrevistadas

Las consultas y asesoramientos se documentarán antes de la entrega final con nombre o función, institución, fecha y tema tratado.

### 7.4. Recursos visuales, imágenes y materiales externos utilizados

Las fotografías, diagramas y recursos visuales se acreditarán antes de la entrega final, indicando autoría, licencia o permiso de uso cuando corresponda.

## 8. Anexos

### A. Tabla de pruebas completa

### B. Diagramas técnicos adicionales

### C. Capturas complementarias del código

### D. Bocetos o versiones anteriores del prototipo
