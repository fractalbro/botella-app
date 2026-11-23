import json, glob, collections, sys
d = sys.argv[1]
R = [json.load(open(f)) for f in sorted(glob.glob(d + '/p[0-9][0-9][0-9].json'))]
print('personas:', len(R))
# metas
g = collections.defaultdict(lambda: [0, 0, collections.Counter(), []])
for r in R:
    for k, v in r['goals'].items():
        g[k][0] += 1; g[k][1] += v['ok']
        if not v['ok']: g[k][2][v.get('donde', '?')] += 1
        else: g[k][3].append(v['pasos'])
print('\n== Metas (logradas / intentadas, pasos medianos, dónde se trabaron)')
for k, (n, ok, where, ps) in sorted(g.items(), key=lambda x: x[1][1] / x[1][0]):
    ps.sort(); med = ps[len(ps) // 2] if ps else '-'
    print(f'{k:14s} {ok:3d}/{n:<3d} {100*ok//n:3d}%  pasos~{med}  trabas: {dict(where.most_common(4))}')
allok = sum(all(v['ok'] for v in r['goals'].values()) for r in R)
print('personas que lograron todo:', allok)
# por segmento
def seg(key):
    c = collections.defaultdict(lambda: [0, 0])
    for r in R:
        v = r['persona'][key]; vals = list(r['goals'].values())
        c[v][0] += len(vals); c[v][1] += sum(x['ok'] for x in vals)
    return {k: f'{100*b//a}%' for k, (a, b) in sorted(c.items(), key=lambda x: str(x[0]))}
for k in ['entrada', 'estrategia', 'soltura', 'dispositivo', 'zoom', 'mic', 'red']:
    print(f'\n{k}:', seg(k))
# problemas
print('\n== Problemas (tipo, pantalla) → personas afectadas')
c = collections.Counter(); ex = {}; sev = {}
for r in R:
    seen = set()
    for i in r['issues']:
        k = (i['type'], i['screen'])
        if k in seen: continue
        seen.add(k); c[k] += 1; ex.setdefault(k, collections.Counter())[i['detail'][:110]] += 1; sev[k] = i['sev']
for (t, s), n in c.most_common(70):
    print(f'{n:3d}  [{sev[(t,s)]}] {t:16s} {s:16s} {ex[(t,s)].most_common(2)}')
print('\n== Errores de JavaScript')
e = collections.Counter(x for r in R for x in set(r['errors']))
for k, n in e.most_common(15): print(n, k[:200])
