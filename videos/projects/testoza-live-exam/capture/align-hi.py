# Forced alignment of the Hindi voice clips to their own script (torchaudio MMS_FA + uroman), so
# every spoken word gets a start/end even where English product words sit inside Hindi sentences.
# Input:  assets/vo-hi/Lnn.wav + Lnn.say.json (spoken words, written by dub-hi.mjs)
# Output: assets/vo-hi/Lnn.align.json  [{w, r (romanised), start, end, score}]  (null for silent tokens)
# Usage:  C:/Users/kumar/.cache/tz-align/venv/Scripts/python capture/align-hi.py assets/vo-hi [L03,L08]
import json, pathlib, re, sys

import torch, torchaudio, uroman

sys.stdout.reconfigure(encoding='utf-8')  # Devanagari on a Windows console
d = pathlib.Path(sys.argv[1])
only = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
bundle = torchaudio.pipelines.MMS_FA
model, tokenizer, aligner = bundle.get_model(with_star=False), bundle.get_tokenizer(), bundle.get_aligner()
roman = uroman.Uroman()

for f in sorted(d.glob('L*.say.json')):
    lid = f.name.split('.')[0]
    if only and lid not in only:
        continue
    words = json.loads(f.read_text('utf8'))
    rom = [re.sub(r"[^a-z']", '', roman.romanize_string(w).lower()) for w in words]
    wav, sr = torchaudio.load(str(d / f'{lid}.wav'))
    wav = torchaudio.functional.resample(wav.mean(0, keepdim=True), sr, bundle.sample_rate)
    with torch.inference_mode():
        emission, _ = model(wav)
    keep = [i for i, r in enumerate(rom) if r]
    spans = aligner(emission[0], tokenizer([rom[i] for i in keep]))
    ratio = wav.size(1) / emission.size(1) / bundle.sample_rate
    out = [None] * len(words)
    for i, sp in zip(keep, spans):
        frames = sum(len(s) for s in sp)
        out[i] = {'w': words[i], 'r': rom[i], 'start': round(sp[0].start * ratio, 3), 'end': round(sp[-1].end * ratio, 3),
                  'score': round(sum(s.score * len(s) for s in sp) / frames, 3)}
    (d / f'{lid}.align.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), 'utf8')
    low = sorted((o['score'], o['w']) for o in out if o)[:3]
    print(lid, len(words), 'words, lowest', ' '.join(f'{w}:{s}' for s, w in low), flush=True)
