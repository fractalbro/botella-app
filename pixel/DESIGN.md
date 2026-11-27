# Botella · Pixel 16-bit (modo claro)

Proyecto aparte de Botella, con otra interfaz. No reemplaza a `nueva/` ni a la app publicada.
Estilo: **RPG de 16 bits con el orden de una app moderna**. El pixel se usa donde suma (botellas, playa, botones de consola, títulos cortos) y todo lo que se lee va en una letra limpia.

## 1. Las cinco botellas

Cada botella es una categoría. El color se ve en el vidrio del sprite, en la etiqueta y en el botón principal de su pantalla.

| Botella | Categoría | Qué lleva | Color | Borde/sombra del vidrio | Brillo | Texto encima |
|---|---|---|---|---|---|---|
| Roja (carmesí) | Confesiones y corazón | Secretos, confesiones y amor | `#E03B3B` | `#9E2133` | `#FF9A8F` | `#FFFFFF` |
| Azul (celeste) | Anécdotas y rumores | Historias del día a día y el chisme del día | `#368DDB` | `#1F5A9E` | `#9ED6FF` | `#FFFFFF` |
| Morada (violeta) | Misterios y noches | Suspenso, miedo y secretos de madrugada | `#7E49AA` | `#4E2A75` | `#CDA6F0` | `#FFFFFF` |
| Verde (esmeralda) | Desahogos y consejos | Reflexiones, días difíciles y apoyo | `#2BA967` | `#18744A` | `#97EBB4` | `#FFFFFF` |
| Amarilla (ámbar) | Aventuras y locuras | Viajes y anécdotas para contar siempre | `#FF8C2B` | `#B85A12` | `#FFD58A` | `#181425` |

Todas las botellas usan el mismo contorno de 1 pixel `#181425`, corcho `#D69A5A`/`#94602F` y papel `#F6EBD0`/`#D9C49A`. La cinta del papel toma el color oscuro de su botella.

## 2. Fundamentos

### Color
| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#FAF6EE` | Fondo (crema suave, con una trama de puntos al 7%) |
| `--paper` | `#FFFFFF` | Tarjetas, botones, barra de abajo |
| `--ink` | `#181425` | Bordes, sombras y texto principal |
| `--ink-2` | `#5A5468` | Texto secundario |
| `--ink-3` | `#8C8698` | Metadatos y ayudas |
| `--line` | `#E7DFCF` | Separadores suaves y tramos vacíos |
| `--sea` | `#368DDB` | Marca y botón central Lanzar |
| `--sand` | `#F2DDB0` | Arena |

### Letras
| Rol | Fuente | Tamaños |
|---|---|---|
| Logo | Press Start 2P | 15 px, letras que ondulan |
| Etiquetas, botones, HUD | Pixelify Sans 600 | 11 a 17 px, mayúsculas con 0.04 a 0.06 em de aire (tiene tildes y ñ, Press Start 2P no) |
| Números y tiempos | VT323 | 20 a 72 px |
| Lectura | Plus Jakarta Sans 500 a 800 | 12, 13, 15, 18, 19 y 26 a 30 px |

### Pixeles nítidos y rejilla
Todos los sprites y escenas son SVG con `shape-rendering:crispEdges` y `image-rendering:pixelated` (y `crisp-edges`). Todas las medidas, márgenes y rellenos son múltiplos de 4 (4, 8, 12, 16, 20, 24, 32). Las zonas de toque miden al menos 44 × 44 px, aunque el dibujo sea más chico.

### Bordes y sombras (sin desenfoque)
```css
/* borde doble: bisel claro arriba a la izquierda y oscuro abajo a la derecha, como una pantalla CRT */
.push{border:3px solid #181425;transition:transform .05s,box-shadow .05s;
  box-shadow:inset 2px 2px 0 var(--hl,#fff),inset -2px -2px 0 var(--k,#C3B091),4px 4px 0 #181425}
.push:active{transform:translate(3px,3px);
  box-shadow:inset 2px 2px 0 var(--hl,#fff),inset -2px -2px 0 var(--k,#C3B091),1px 1px 0 #181425}
/* al apuntar o con el teclado aparece un puntero ▶ pixelado a la izquierda */
```
En los botones de color, el bisel toma el brillo y el tono oscuro de su botella.
Los bloques pequeños (chips, etiquetas, avisos sobre la playa) usan borde de 2 px y sombra de 2 o 3 px. Las esquinas son rectas.

### Movimiento
- **Ritmo de consola:** la onda de voz rebota a 12 cuadros por segundo; las partículas y el barrido entre pantallas, a 15. El resto corre a 60.
- **Flotar:** las botellas del mar se mecen con un seno suave (de -3° a 3° y de 4 a 8 px), cada una con su propio ritmo para que nunca se muevan juntas.
- **Saltar:** la botella que tocas se aplasta, salta y se asienta (aplastar y estirar).
- **Lanzar:** la botella sigue al dedo con un resorte (tensión 180, fricción 12). Si la sueltas rápido hacia arriba, sale volando en parábola, gira, se achica y cae al mar con un splash.
- **Destapar:** la botella sube con rebote, el corcho se aplasta y sale disparado con "¡Pop!", explotan partículas del color de la botella y la voz sube desde el cuello como vapor.
- **Barra de vida:** grabar y llegar a gente se muestran con una barra que se llena por bloques, con un destello en la punta.
- **Entrar:** el reproductor y las tarjetas suben con un pequeño rebote (pasan al 105% y se asientan).
- **Cambiar de pantalla:** barrido de bloques oscuros, sin fundidos. Al abrir la app, una botella se mece sobre el agua mientras carga.
- **Sonido y vibración:** un "pop" corto de 8 bits y una vibración breve al destapar, lanzar y enviar.
- Con "reducir movimiento" se apaga todo.

### Tramas de puntos
Los cambios de color de la isla (arena seca, arena mojada, espuma, agua clara y agua profunda) y las sombras usan tramas de ajedrez, nunca degradados suaves.

### Espacios
Margen lateral de 20 px, columna máxima de 430 px. Entre bloques, 18 a 30 px. En el iPhone SE el reproductor se compacta para que el botón de escuchar quede a la vista.

## 3. Componentes
- **Botella (sprite):** 12 × 19 pixeles en SVG con `crispEdges`. Se dibuja a escala entera (24 px en el mar, 36 px en la arena y al elegir).
- **Isla:** bloque isométrico de 112 × 84 pixeles con arena y mar arriba, estratos de arena y agua en los lados, espuma en dos cuadros y una sombra en trama. Las botellas son botones encima de la escena. "!" marca las que no escuchaste.
- **Filtro por color:** chips con un cuadrado del color de cada botella.
- **Reproductor:** etiqueta del color, la frase en letra grande, quién la mandó (por tema en común, nunca por nombre ni distrito), onda hecha de bloques que se llena con el color mientras suena, y botones anterior, escuchar y siguiente, más Responder.
- **Barra de consola:** Playa, Botellas, Lanzar (botón central azul que se hunde), Voces y Perfil.
- **Lanzar:** se elige la botella en un estante de arena, se graba con un botón cuadrado grande y hay ideas por si no sabes qué decir. Al lanzar, la botella vuela al mar y sube en vivo el número de personas que ya la recibieron.
- **Mis botellas (inventario):** cifras en tres casillas, botellas que te quedan hoy y tarjetas de cada botella en el mar.
- **Voces:** conversaciones con el camino Voces, Nombres, Llamada y Plan, y el chat con notas de voz.
- **Perfil:** la forma de tu voz, tu racha de días grabando, tus temas y lo que nadie ve.

- **Entrada:** bienvenida con la isla, cuenta con una pregunta por pantalla (letra grande y línea punteada pixel) y temas (eliges tres).
- **Llamada:** solo voces, con anillos pixelados que laten en el color de la botella.
- **Tu mes:** cuatro láminas que se pasan tocando, con barras de colores y una celebración al final.

## Reglas que se mantienen
- El nombre aparece solo cuando los dos deciden compartirlo. El distrito nunca se muestra.
- La voz nunca se modifica.
- La botella sigue llegando a más gente hasta que alguien responde. No se habla de esperas ni de horas.
- No se usa "lacre".

## Ajustes de la evaluación (27/11)
- **Nombres de las botellas:** un nombre corto en toda la app (Confesiones, Anécdotas, Misterios, Desahogos, Aventuras). La descripción larga solo aparece al elegir.
- **Peso visual:** el bisel y la sombra de tinta de 4 px son para lo que se toca. La información usa borde de 2 px y sombra suave `#D9CDB4`.
- **Color:** el color es solo el tipo de botella. Los temas van en tinta neutra.
- **Letra pixel:** solo en etiquetas de 1 o 2 palabras. Si una etiqueta tiene más de 18 letras, pasa a la letra de lectura (clase `.lg`).
- **Movimiento:** cambiar de pestaña es instantáneo. El barrido de bloques queda para los momentos grandes.
- **Pantallas bajas (≤ 700 px):** la Playa se compacta para que Escuchar y Responder queden sobre la barra. En Lanzar, al terminar de grabar se ocultan los colores y se ven la botella y el botón.
