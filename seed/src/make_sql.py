# Escribe el bloque de personas de ejemplo al final de supabase/schema.sql a partir de personas.json y manifest.json.
import json, os
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = json.load(open(os.path.join(root, 'seed/src/personas.json'))); M = json.load(open(os.path.join(root, 'seed/src/manifest.json')))
q = lambda s: "'" + str(s).replace("'", "''") + "'"
arr = lambda xs: "'{" + ','.join('"' + x + '"' for x in xs) + "}'"
pk = lambda k: q(json.dumps(M[k]['peaks'])) + '::jsonb'
L = ['-- ========== PERSONAS DE EJEMPLO ==========',
     '-- 12 voces sintéticas para que las primeras personas tengan con quién probar. Se ven marcadas como "de ejemplo".',
     '-- Para apagarlas: update public.bottles set hidden = true where owner in (select id from public.profiles where is_sample);',
     '-- (Generado por seed/src/make_sql.py)']
for i, p in enumerate(P['people'], 1):
    uid = f"5a5a0000-0000-4000-8000-{i:012d}"; bid = f"5a5ab000-0000-4000-8000-{i:012d}"; k = p['id']
    L.append(f"insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('00000000-0000-0000-0000-000000000000', '{uid}', 'authenticated', 'authenticated', '{k}.ejemplo@botella.invalid', '', now(), '{{}}', '{{}}', now(), now()) on conflict (id) do nothing;")
    L.append(f"insert into public.profiles(id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, is_sample, code_used, bottles) values ('{uid}', {q(p['name'])}, {q(p['district'])}, {arr(p['topics'])}, '{{}}', 'seed/{k}-intro.mp3', {M[k+'-intro']['secs']}, {pk(k+'-intro')}, true, 'EJEMPLO', 0)"
             f" on conflict (id) do update set name = excluded.name, district = excluded.district, topics = excluded.topics, intro_voice = excluded.intro_voice, intro_secs = excluded.intro_secs, intro_peaks = excluded.intro_peaks, is_sample = true;")
    L.append(f"insert into public.bottles(id, owner, kind, body, voice, voice_secs, voice_peaks, featured, created_at) values ('{bid}', '{uid}', {q(p['kind'])}, {q(p['body'])}, 'seed/{k}-say.mp3', {M[k+'-say']['secs']}, {pk(k+'-say')}, {str(bool(p.get('featured'))).lower()}, now() - interval '{i * 3} hours')"
             f" on conflict (id) do update set kind = excluded.kind, body = excluded.body, voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, featured = excluded.featured;")
    L.append(f"insert into public.sample_voices(id, key, reply_voice, reply_secs, reply_peaks, call_voice, call_secs) values ('{uid}', '{k}', 'seed/{k}-reply.mp3', {M[k+'-reply']['secs']}, {pk(k+'-reply')}, 'seed/{k}-call.mp3', {M[k+'-call']['secs']})"
             f" on conflict (id) do update set reply_voice = excluded.reply_voice, reply_secs = excluded.reply_secs, reply_peaks = excluded.reply_peaks, call_voice = excluded.call_voice, call_secs = excluded.call_secs;")
for kind, lst in (('answer', P['answers']), ('planok', P['planok'])):
    for n in range(1, len(lst) + 1):
        key = f'{kind}-{n}'
        L.append(f"insert into public.sample_clips(kind, n, voice, secs, peaks) values ('{kind}', {n}, 'seed/{key}.mp3', {M[key]['secs']}, {pk(key)}) on conflict (kind, n) do update set voice = excluded.voice, secs = excluded.secs, peaks = excluded.peaks;")
# salidas de ejemplo, cada semana
outs = [('majo', 'Caminata al atardecer', 'Malecón de Miraflores, frente al Parque del Amor', 6, '17:30', 8, 'Caminamos del Parque del Amor al faro y terminamos en un café. Cada uno paga lo suyo.'),
        ('rocio', 'Preguntas frente al mar', 'Bajada de Baños, Barranco', 5, '18:00', 8, 'Cada uno trae una pregunta que lanzó esta semana y la contestamos en voz alta.'),
        ('leo', 'Cine y conversa', 'Un cine en Lince, luego café', 3, '20:00', 6, 'Vemos la película de la semana y la comentamos a la salida.')]
ids = {p['id']: i for i, p in enumerate(P['people'], 1)}
for j, (k, name, place, dow, hm, cap, descr) in enumerate(outs, 1):
    uid = f"5a5a0000-0000-4000-8000-{ids[k]:012d}"
    L.append(f"insert into public.outings(id, owner, name, place, starts_at, cap, descr, weekly) values ('5a5a0e00-0000-4000-8000-{j:012d}', '{uid}', {q(name)}, {q(place)}, ((date_trunc('week', now() at time zone 'America/Lima') + interval '{dow - 1} days' + time '{hm}') at time zone 'America/Lima'), {cap}, {q(descr)}, true) on conflict (id) do update set name = excluded.name, place = excluded.place, descr = excluded.descr;")
L.append('-- ========== FIN PERSONAS DE EJEMPLO ==========')
f = os.path.join(root, 'supabase/schema.sql'); s = open(f).read()
a = s.find('-- ========== PERSONAS DE EJEMPLO ==========')
if a >= 0: s = s[:a] + s[s.index('-- ========== FIN PERSONAS DE EJEMPLO ==========') + 47:].lstrip('\n')
open(f, 'w').write(s.rstrip('\n') + '\n\n' + '\n'.join(L) + '\n')
print(len(L), 'líneas')
