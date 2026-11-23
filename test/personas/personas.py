import json, random
R = random.Random(2211)
nombres_f = "Rosa Milagros Carmen Lucía Andrea Valeria Camila Fiorella Patricia Ximena Gaby Mayra Yesenia Jimena Sofía Alessandra Diana Nataly Flor Vanessa Liz Karina Wendy Pilar Teresa Doris Elena Susana Luz Maricielo".split()
nombres_m = "José Luis Carlos Jorge Miguel Renzo Diego Kevin Brayan Juan Manuel Piero Sebastián Rodrigo Christian Víctor Óscar Raúl Alonso Gabriel Franco Martín Paolo Hugo Wilmer Edwin Jhon César Aldo Joaquín".split()
distritos = "San Juan de Lurigancho|Comas|San Martín de Porres|Ate|Callao|Los Olivos|Villa El Salvador|Surco|Miraflores|Barranco|Lince|Jesús María|Pueblo Libre|San Miguel|Chorrillos|La Molina|Independencia|Breña|Rímac|Magdalena".split('|')
ocup = ["estudiante de instituto","universitaria/o","mototaxista","bodeguera/o","enfermera/o","vendedor/a de tienda","call center","profesor/a de colegio","jubilada/o","delivery en moto","diseñador/a freelance","contador/a","cocinera/o","mamá/papá a tiempo completo","programador/a","vigilante","peluquera/o","practicante","chofer de app","administrativa/o"]
motivos = ["hacer amigos nuevos","conocer pareja","contar algo que no le cuenta a nadie","le mandaron un link y tiene curiosidad","se mudó a Lima y está sola/o","escéptica/o: cree que es otra app de citas","quiere sentirse escuchada/o","aburrimiento en el trayecto","mujer que teme el acoso en apps","tímida/o, nunca manda audios"]
def pick(d):  # dict valor->peso
    x = R.random()*sum(d.values())
    for k,w in d.items():
        x -= w
        if x <= 0: return k
    return k
estr = ['principal']*18+['lector']*14+['impaciente']*16+['explorador']*12+['toca_todo']*10+['teclado']*8+['lector_pantalla']*8+['atras']*7+['doble']*7
R.shuffle(estr)
entradas = ['invitacion']*45+['lectura']*18+['duo']*12+['vuelve']*15+['sin_codigo']*10
R.shuffle(entradas)
P = []
for i in range(100):
    edad = pick({20:22, 29:28, 41:22, 56:16, 68:12}) + R.randint(-3,4)
    f = R.random() < .52
    sol = 'baja' if edad >= 60 and R.random()<.6 else pick({'baja':18,'media':47,'alta':35})
    if edad < 30 and sol == 'baja' and R.random()<.7: sol = 'media'
    disp = pick({'iPhone SE':18,'iPhone 13':20,'Android chico':22,'Android grande':22,'Escritorio':10,'Tablet':8})
    zoom = 1.0
    if edad >= 55: zoom = pick({1.0:40,1.3:30,1.5:20,2.0:10})
    elif R.random() < .1: zoom = 1.3
    est = estr[i]
    if est == 'lector_pantalla': zoom = 1.0
    p = dict(
        id=i+1, nombre=R.choice(nombres_f if f else nombres_m), genero='f' if f else 'm', edad=edad,
        distrito=R.choice(distritos), ocupacion=R.choice(ocup), soltura=sol,
        motivo=('mujer que teme el acoso en apps' if f and R.random()<.18 else R.choice(motivos)),
        entrada=entradas[i], dispositivo=disp, zoom=zoom,
        red=pick({'normal':75,'lenta':15,'se_corta':10}),
        mic=pick({'ok':80,'denegado':15,'no_tiene':5}),
        reducir_movimiento=R.random()<.12,
        estrategia=est,
        paciencia={'baja':R.randint(14,22),'media':R.randint(22,32),'alta':R.randint(30,42)}[pick({'baja':30,'media':45,'alta':25}) if est!='impaciente' else 'baja'],
        lee=('poco' if est in ('impaciente','doble') else 'todo' if est=='lector' else pick({'todo':30,'algo':45,'poco':25})),
        se_equivoca=R.random()<.3,
        nombre_largo=R.random()<.06,
    )
    P.append(p)
json.dump(P, open('personas.json','w'), ensure_ascii=False, indent=1)
import collections
for k in ['entrada','estrategia','dispositivo','soltura','red','mic','zoom']:
    print(k, dict(collections.Counter(x[k] for x in P)))
print('edad', min(x['edad'] for x in P), max(x['edad'] for x in P))
