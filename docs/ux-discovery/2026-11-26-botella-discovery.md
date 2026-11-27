# Botella · Documento de descubrimiento UX (26/11/2026)

Base: lo que ya sabemos del proyecto (propósito, reglas confirmadas por Cesar), el análisis de 5 usuarios sintéticos (`entender/analisis-usuarios-sinteticos.md`) y la prueba con 100 usuarios sintéticos (llegar 81 %, lanzar 65 %, llamada 77 %, volver 19 %, seguridad 93 %). Todo es simulación: sirve para priorizar, no para medir. Etiqueta de evidencia: **[S]** sintético, **[R]** regla de producto, **[H]** hipótesis.

## 1. Problema

- **Problema:** en Lima es difícil conocer gente nueva sin pasar primero por la foto; mucha gente se siente sola y no tiene una forma fácil de empezar a hablar con alguien.
- **Quién lo siente:** personas de 18 a 45 en Lima que quieren conversar, no necesariamente citas; tímidas o cansadas de las apps de fotos.
- **Alternativas hoy:** Tinder, Bumble, Instagram (todo pasa por la imagen); NGL y apps de confesiones (anónimas, sin conversación real); grupos de WhatsApp (solo gente que ya conoces).
- **Por qué fallan:** juzgan por la cara, premian el deslizar rápido, no hay conversación de verdad o no hay gente nueva.
- **Alcance:** producto nuevo, prototipo `nueva/` ya construido. Falta conectarlo a Supabase.

## 2. Personas (por prioridad)

| | Persona | Meta principal | Frustración | Uso |
|---|---|---|---|---|
| **1 (primaria)** | **Andrea, 23, tímida** | Hablar con alguien sin que la miren primero | No sabe qué esperar después de lanzar; teme que la otra persona se entere de todo | Noche, en casa, con audífonos [S] |
| 2 | **Diego, 27, escéptico, viene de Bumble** | Comprobar que hay gente real y que vale la pena | Ver "voz de computadora" lo convence de que no hay nadie | Ratos muertos, rápido [S] |
| 3 | **Julio, 52, usa WhatsApp** | Conversar, pasar el rato | No descubre qué se toca; teme que le cobren | De día, pocas apps [S] |

Camila (19) y Rocío (34) quedan como secundarias: sus dudas (qué es "lectura", "¿me van a llamar?") ya están cubiertas por las de las tres de arriba.

## 3. Trabajos por hacer (JTBD)

- **Funcional:** *Cuando me siento solo en la noche, quiero decirle algo en voz alta a alguien nuevo, para empezar una conversación sin depender de mi foto.*
- **Funcional:** *Cuando me llega una voz, quiero escucharla y responder en segundos, para que la conversación no se enfríe.*
- **Emocional:** sentirme escuchado; no sentirme juzgado; sentirme seguro (mi distrito y mi nombre son míos) [R].
- **Social:** tener algo que contar ("conocí a alguien por su voz"); invitar a un amigo sin vergüenza.

Puntaje de oportunidad (importancia vs. satisfacción hoy, [S]): saber qué pasa después de lanzar **alto**; saber que hay gente real **alto**; volver al día siguiente **muy alto** (volver 19 %); seguridad **ya bien** (93 %).

## 4. Recorrido

**Hoy (app actual, [S]):** bienvenida clara → descorchar confuso → orilla con cuatro productos a la vez → lanzar con muchas opciones → espera sin explicación → 19 % vuelve.

**Deseado (app nueva):**

| Momento | Qué hace | Qué siente | Qué lo hace posible |
|---|---|---|---|
| Llegar | Lee una frase, toca un botón | "Entiendo" | Bienvenida de una frase |
| Primera voz | Escucha una botella | Curiosidad | El Mar muestra botellas tocables, con etiqueta |
| Lanzar | Graba y desliza | Nervios → alivio | Grabar, escuchar, deslizar para lanzar |
| Esperar | Sabe que llega a 8 y sigue viajando hasta que alguien responda | Emoción por quién aparecerá | Pantalla "lanzada" con la regla clara [R] |
| Conversar | Responde con su voz | Cercanía | Chat privado; nombres solo si los dos quieren [R] |
| Volver | Abre la app al día siguiente | Ganas | Racha, botellas doradas, "N botellas te esperan" |

**Brecha principal:** el paso Esperar → Volver. Ahí se pierde la mayoría.

## 5. Métricas y telemetría (solo plan; el panel va después)

- **Estrella polar:** conversaciones con al menos 3 notas de voz por semana.
- **Activación:** % que lanza su primera botella el día 1 (meta 75 %, hoy 65 % [S]).
- **Retención:** D1 ≥ 35 %, D7 ≥ 20 % (hoy "volver" 19 % [S]).
- **Salud:** reportes por cada 100 conversaciones; % de botellas sin respuesta a las 6 h (interno; nunca se muestra como espera).
- **Eventos:** `botella_escuchada`, `botella_lanzada{dorada}`, `respuesta_enviada`, `nombres_compartidos`, `reporte_creado`, `invitacion_copiada`, `sesion_iniciada{dias_desde_ultima}`.
- **Decisión:** si a las 6 h más del 40 % de botellas no tiene respuesta, subir el alcance antes que agregar funciones.

## 6. Principios de diseño

1. **Un verbo por pantalla.** Escuchar, lanzar o responder; lo demás espera.
2. **Decir qué pasa después.** Cada acción termina diciendo qué viene y cuándo.
3. **La voz primero, la cara nunca.** Ni foto ni distrito; un tema en común [R].
4. **Palabras de la calle, no de la metáfora.** El mar es la ambientación; los botones dicen lo que hacen.
5. **Todo se puede deshacer, salvo lo que no.** Deshacer en lo cotidiano; confirmar solo lo irreversible.

## 7. Supuestos y riesgos

| Supuesto | Estado | Riesgo si falla |
|---|---|---|
| La gente se anima a grabar su voz | [S] 65 % lanza | Mar vacío |
| 8 + 4 personas bastan para recibir respuesta | [H] | Espera sin respuesta, abandono |
| La racha y las doradas traen de vuelta | [H] | Volver se queda en ~19 % |
| Sin precios en la beta no asusta | [S] Julio temía cobros | Bajo |
| Moderación de voz a escala | [H] | Seguridad baja del 93 % |

## 8. Siguientes pasos

1. Validar la app nueva contra este documento (ux-validate) y arreglar lo que falle.
2. Conectar `nueva/` a Supabase y medir con gente real (los eventos de arriba).
3. Prueba con 5 personas reales de Lima, una de cada persona.
