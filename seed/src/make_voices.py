# Genera las voces de ejemplo (Kokoro y Piper vía sherpa-onnx 1.12) y guarda seed/v/*.mp3 y seed/src/manifest.json.
# Uso: pip install "sherpa-onnx<1.13" soundfile; python3 seed/src/make_voices.py <carpeta-con-modelos>
# Modelos: https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models (kokoro-multi-lang-v1_0, vits-piper-es_MX-claude-high,
#          vits-piper-es_MX-ald-medium, vits-piper-es_AR-daniela-high)
import glob, json, os, subprocess, sys, numpy as np, soundfile as sf, sherpa_onnx as so
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); M = sys.argv[1].rstrip('/') + '/'
P = json.load(open(os.path.join(root, 'src', 'personas.json'))); out = os.path.join(root, 'v'); os.makedirs(out, exist_ok=True)
eng = {}
def engine(name):
    if name in eng: return eng[name]
    if name == 'kokoro':
        d = M + 'kokoro-multi-lang-v1_0/'
        c = so.OfflineTtsModelConfig(kokoro=so.OfflineTtsKokoroModelConfig(model=d + 'model.onnx', voices=d + 'voices.bin', tokens=d + 'tokens.txt', data_dir=d + 'espeak-ng-data', lang='es'), num_threads=4)
    else:
        d = M + 'vits-piper-' + name + '/'
        c = so.OfflineTtsModelConfig(vits=so.OfflineTtsVitsModelConfig(model=glob.glob(d + '*.onnx')[0], tokens=d + 'tokens.txt', data_dir=d + 'espeak-ng-data', noise_scale=.6, noise_scale_w=.7), num_threads=4)
    eng[name] = so.OfflineTts(so.OfflineTtsConfig(model=c, max_num_sentences=1)); return eng[name]
man = {}
def make(key, voice, text, speed=1.0):
    kind, arg = P['voices'][voice].split(':')
    t = engine('kokoro' if kind == 'kokoro' else arg)
    a = t.generate(text, sid=int(arg) if kind == 'kokoro' else 0, speed=speed)
    x = np.array(a.samples, dtype=np.float32); sr = a.sample_rate
    wav = f'/tmp/seed-{key}.wav'; sf.write(wav, x, sr)
    mp3 = os.path.join(out, key + '.mp3')
    af = 'highpass=f=70,acompressor=threshold=-20dB:ratio=2.5,loudnorm=I=-17:TP=-2,adelay=150,apad=pad_dur=0.3'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', af, '-ac', '1', '-ar', '24000', '-b:a', '48k', mp3], check=True); os.remove(wav)
    ch = np.array_split(np.abs(x), 28); pk = np.array([c.max() for c in ch]); pk = np.maximum(.12, pk / (pk.max() or 1))
    man[key] = {'secs': max(1, round(len(x) / sr + .45)), 'peaks': [round(float(v), 2) for v in pk]}; print(key, man[key]['secs'], 's')
for p in P['people']:
    for part in ('say', 'reply', 'intro', 'call'): make(f"{p['id']}-{part}", p['voice'], p[part], p.get('speed', 1))
for i, a in enumerate(P['answers']): make(f'answer-{i + 1}', a['voice'], a['say'])
for i, a in enumerate(P['planok']): make(f'planok-{i + 1}', a['voice'], a['say'])
json.dump(man, open(os.path.join(root, 'src', 'manifest.json'), 'w'))
