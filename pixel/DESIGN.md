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

### Bordes y sombras (sin desenfoque)
```css
--b: 3px;                         /* borde de todo bloque */
--sh: 4px 4px 0 #181425;          /* sombra sólida */
.push{border:3px solid #181425;box-shadow:4px 4px 0 #181425}
.push:active{transform:translate(4px,4px);box-shadow:0 0 0 #181425} /* se hunde como un botón de consola */
```
Los bloques pequeños (chips, etiquetas, avisos sobre la playa) usan borde de 2 px y sombra de 2 o 3 px. Las esquinas son rectas.

### Movimiento
Todo se mueve por pasos (`steps()`), como en una consola: las botellas del mar flotan en 2 pasos, la botella tocada salta en 5, el logo ondula letra por letra, los botones se hunden en 1. Con "reducir movimiento" se apaga todo.

### Espacios
Margen lateral de 20 px, columna máxima de 430 px. Entre bloques, 18 a 30 px. En el iPhone SE el reproductor se compacta para que el botón de escuchar quede a la vista.

## 3. Componentes
- **Botella (sprite):** 12 × 19 pixeles en SVG con `crispEdges`. Se dibuja a escala entera (24 px en el mar, 36 px en la arena y al elegir).
- **Playa:** escena de 96 × 66 pixeles con cielo en franjas, nubes, mar que se aclara hacia la orilla, espuma que se mueve y arena en escalera. Las botellas son botones encima de la escena. "!" marca las que no escuchaste.
- **Filtro por color:** chips con un cuadrado del color de cada botella.
- **Reproductor:** etiqueta del color, la frase en letra grande, quién la mandó (por tema en común, nunca por nombre ni distrito), onda hecha de bloques que se llena con el color mientras suena, y botones anterior, escuchar y siguiente, más Responder.
- **Barra de consola:** Playa, Botellas, Lanzar (botón central azul que se hunde), Voces y Perfil.
- **Lanzar:** se elige la botella en un estante de arena, se graba con un botón cuadrado grande y hay ideas por si no sabes qué decir. Al lanzar, la botella vuela al mar y sube en vivo el número de personas que ya la recibieron.
- **Mis botellas (inventario):** cifras en tres casillas, botellas que te quedan hoy y tarjetas de cada botella en el mar.
- **Voces:** conversaciones con el camino Voces, Nombres, Llamada y Plan, y el chat con notas de voz.
- **Perfil:** la forma de tu voz, tu racha de días grabando, tus temas y lo que nadie ve.

## Reglas que se mantienen
- El nombre aparece solo cuando los dos deciden compartirlo. El distrito nunca se muestra.
- La voz nunca se modifica.
- La botella sigue llegando a más gente hasta que alguien responde. No se habla de esperas ni de horas.
- No se usa "lacre".
