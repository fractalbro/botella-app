# Botella Design Language

> Extraído con /map-design (design-superpowers) el 26/11/2026 de `botella-app/nueva` (app.css, app.js) y `botella-web/nueva` (site.css). Nivel: L0 → L1.
> Fuente: CSS escrito a mano (custom properties en `:root`), no una lectura de Figma.
> Columna "Estado": **actual** = lo que hay hoy; **objetivo** = la consolidación que propone la revisión (`/mnt/project-files/botella/nueva/revision-diseno.md`).

## Visual Theme
**Íntima, nocturna, cálida, precisa: una carta en una botella.**
De noche en el mar de Lima. El fondo es azul noche, nunca negro. La voz de otra persona vive en papel crema, que es lo único cálido de la pantalla, y la acción va en turquesa. Las referencias son el silencio de Things y Linear, con la calidez de una carta escrita a mano. El 3D (botella de vidrio y faro) aparece solo en tres momentos: bienvenida, abrir y lanzar.

## Color Palette
### Neutrals (noche)
| Token | Valor | Rol | Estado |
|---|---|---|---|
| `--bg` | `#05121F` | Fondo de toda la app | actual |
| `--bg-2` | `#0A1B2B` | Superficie elevada (tarjetas, sheet) | actual |
| `--fg` | `#F4EFE7` | Texto principal (off-white cálido) | actual |
| `--fg-2` | `rgba(244,239,231,.62)` | Texto secundario (6.8:1) | actual |
| `--fg-3` | `rgba(244,239,231,.40)` → **.56** | Texto terciario: hoy 3.4:1 ✗, objetivo ≥ 4.6:1 | objetivo |
| `--line` | `rgba(244,239,231,.09)` | Divisores | actual |
| `--line-2` | `rgba(244,239,231,.18)` | Bordes de chips e inputs | actual |

### Brand
| Token | Valor | Rol |
|---|---|---|
| `--a` | `#7FD8C9` | **Única** acción por pantalla, estado vivo (en camino, grabando) |
| `--on-a` | `#04121C` | Texto sobre turquesa (11:1) |
| `--a-soft` | `rgba(127,216,201,.14)` | Fondo de estado activo |
| `--paper` | `#F3E6C8` | La voz de otra persona. Nada más usa crema |
| `--ink` / `--ink-2` | `#2A2016` / `rgba(42,32,22,.6)` | Texto sobre papel |
| `--warm` | `#FFE7B0` | Luz del faro, dorada, "tienes" |

### Colores de tema (orbes de cada persona)
`#FF70A9` música · `#8E8CFF` cine · `#FFB061` la ciudad · `#9FE3B0` libros · `#FFC24B` dorada. Solo en puntos de 7 a 12 px y en el vidrio de la botella, nunca en texto ni en fondos grandes.

### Semantic
| Rol | Valor |
|---|---|
| Peligro (colgar, reportar) | `--danger #FF7B7E` |
| Éxito | Turquesa `--a`, sin un verde aparte |
| Aviso | `--warm` |

Modo claro: no existe. Botella es de noche por diseño.

## Typography
**Familia:** Geist 300/400/500 (Google Fonts; fallback Helvetica Neue). Sin serif ni cursiva.
**Regla de titulares:** son de dos tonos por peso (500 y luego 300 en `--fg-2`), nunca en color.
**Escala:** hoy hay 13 tamaños sueltos (ad hoc). **Objetivo:** escala de 6 pasos con razón de aproximadamente 1.33.

| Token | Tamaño | Rol | Interlineado |
|---|---|---|---|
| `--t1` | 13px | Leyendas, metadatos | 1.4 |
| `--t2` | 15px | Cuerpo, filas | 1.45 |
| `--t3` | 17px | Botones, texto destacado | 1.35 |
| `--t4` | 22px | Título de tarjeta o sheet | 1.2 |
| `--t5` | clamp(26px, 7.4vw, 30px) | Título de pantalla | 1.08 |
| `--t6` | clamp(44px, 12vw, 56px) | Momento (número de racha, "Va en camino") | 1.0 |

Letter-spacing: −0.03em desde 22 px hacia arriba, −0.005em en el cuerpo.

## Components
| Componente | Nivel | Propósito | Variantes |
|---|---|---|---|
| Button | Primitivo | Acción | `a` (turquesa, 1 por pantalla) · `2` (vidrio) · `q` (texto) |
| Chip | Primitivo | Elegir uno o varios | normal · `sm` (44 px de toque) · presionado (invertido crema) |
| Seg | Primitivo | Elegir tipo (Pregunta / Confesión / Historia) | — |
| Icon button (`ib`) | Primitivo | Atrás o cerrar | — |
| Orb | Primitivo | Color de tema de una persona | — |
| Reach dots | Primitivo | 8 + 4 personas | sm · big · heard · on · later |
| Player | Componente | Una nota de voz | sobre papel · mía (vidrio) |
| Paper | Componente | La voz de otro (pregunta + player) | grande · fila |
| Item (fila) | Componente | Lista navegable | con icono · con arte (botella) · `waiting` |
| Surface (tarjeta) | Componente | Agrupar | **objetivo: solo `flat` y `raised`** (hoy hay 7 estilos) |
| Mic | Componente | Grabar | quieto · grabando |
| Slider | Componente | Desliza para lanzar o enviar | — |
| Sheet | Componente | Decisión corta sobre la pantalla | — |
| Toast | Componente | Confirmación pasajera | — |
| Tabs | Patrón | Mar · Lanzar · Conversaciones | — |
| Pantalla "momento" | Plantilla | 3D + una frase + un botón abajo | bienvenida · abrir · lanzada |
| Pantalla "lista" | Plantilla | Título, subtítulo y filas (Perfil, Muelle…) | — |
| Pantalla "grabar" | Plantilla | Contexto, mic al centro, deslizar | grabar · lanzar · hoy · lecnueva · dos |

**Estados que faltan:** carga (skeleton) en listas cuando haya Supabase, y foco atrapado y cierre con Esc en el sheet.

## Layout
**Grid:** una columna de máximo 480 px en la app. En la web, bandas a todo el ancho con contenido de máximo 1180 px.
**Base:** 4 px. **Espaciado:** xs 4 · sm 8 · md 16 · lg 24 · xl 36 · 2xl 56. Margen lateral `--pad` 24 px (20 px en pantallas bajas).
**Radios (objetivo):** `--r-s` 12 px (iconos, inputs) · `--r-m` 20 px (tarjetas, papel, sheet) · redondo 999 px (botones, chips). Hoy hay 12 valores.
**Pantallas altas (más de 760 px):** el contenido se agrupa al centro. Las listas quedan arriba y el botón principal abajo.

## Depth
En modo oscuro la elevación es tonal: más luz arriba, no sombras negras.
| Nivel | Valor | Uso |
|---|---|---|
| 0 | `--bg` | Fondo |
| 1 | `rgba(244,239,231,.05)` | Superficie plana (filas agrupadas, stats) |
| 2 | `--bg-2` + `0 24px 48px -24px rgba(2,10,20,.8)` | Sheet, papel, tarjeta elevada |
| Vidrio | `backdrop-filter: blur(14px)` + `rgba(5,18,31,.72)` | Barra de la web y tabs |

Las sombras siempre van teñidas hacia `#020A14`, nunca hacia `#000`.

## Do's and Don'ts
### Do
- Una pantalla, una cosa, con un solo botón turquesa.
- Mostrar en vez de explicar: puntos 8 + 4, onda de audio, barra de pasos.
- Usar crema solo para la voz de otra persona.
- Escribir para quien no conoce Botella: cada frase dice quién hace qué.
- Respetar "reducir movimiento" en toda animación.

### Don't
- Etiquetas en MAYÚSCULAS sobre cada bloque, ni texto en color.
- Más de 3 decisiones visibles por pantalla.
- Fotos de personas, likes o distrito.
- Sombras negras, brillos de neón, degradados en el texto.
- Bajar la resolución del 3D para ganar fluidez: Cesar quiere nitidez completa.

## Responsive
App: de 320 a 480 px de ancho. En escritorio queda centrada con bordes laterales. Las pantallas bajas (menos de 600 px) reducen el mic y el mar. En la web, desde 760 px hay dos columnas en las secciones de escuchar y de pasos, y el faro se desplaza a la derecha.

## Agent Prompt Guide
- Usa solo los tokens de `:root`; nunca un hex nuevo, salvo los 5 colores de tema.
- Un botón `btn-a` por pantalla como máximo.
- La voz de otra persona va siempre en `paper` con `player`. La tuya va en vidrio (`player.mine`).
- Los titulares en Geist 500 + 300, nunca en negrita mayor a 500 ni en color.
- El texto terciario debe pasar 4.5:1. Si dudas, usa `--fg-2`.
