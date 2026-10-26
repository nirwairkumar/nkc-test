# Crops the real TestoZa screens into assets/ui/ at the size they display on the 1080x1920 canvas.
# Sources: capture/run3 (real photo import, 2x screenshots + element rects in log.json) and
# capture/ui (re-rendered launch-film screens, see reshoot.mjs). Run from the project root.
import json, os
from PIL import Image

OUT = 'assets/ui'
os.makedirs(OUT, exist_ok=True)
W = 960


def crop(src, box, width, out):
    im = Image.open(src).convert('RGB')
    x0, y0, x1, y1 = [round(v) for v in box]
    c = im.crop((x0, y0, x1, min(y1, im.height)))
    h = round(c.height * width / c.width)
    c.resize((width, h), Image.LANCZOS).save(f'{OUT}/{out}.png', optimize=True)
    print(out, width, h)


# real run 3: progress card (top part) and the questions column under its sticky header, per state
log = [l for l in json.load(open('capture/run3/log.json')) if 'name' in l]
for l in log:
    r = l['r']
    c, qh = r['card'], r['qhead']
    crop(f"capture/run3/{l['name']}.png", (2 * c['x'], 2 * c['y'], 2 * (c['x'] + c['w']), 2 * (c['y'] + 205)), W, f"card-{l['name']}")
    crop(f"capture/run3/{l['name']}.png", (2 * qh['x'], 2 * qh['y'], 2 * (qh['x'] + qh['w']), 2 * (qh['y'] + 440)), W, f"qs-{l['name']}")

# the ready screen (real run 3): header, four tiles, question 1
R = 'capture/run3/ready.png'
crop(R, (228, 192, 2460, 420), W, 'ready-head')
for i, x in enumerate([228, 792, 1357, 1920]):
    crop(R, (x, 457, x + 540, 682), 450, f'tile-{i}')
crop(R, (220, 975, 1916, 1472), W, 'ready-q1')

# "Selected files": the photo's file card
crop('capture/run3/selected.png', (704, 260, 1984, 522), W, 'selected')

# re-rendered real screens with this test's text
crop('capture/ui/mytests.png', (40, 0, 2320, 1000), W, 'mytests')
crop('capture/ui/toast-code.png', (0, 0, 720, 152), W, 'toast')
for p in ['phone-join-0', 'phone-join-1', 'phone-join-2', 'phone-join-3', 'phone-join-4', 'phone-join-5',
          'phone-join-6', 'phone-exam-0', 'phone-exam-1']:
    crop(f'capture/ui/{p}.png', (0, 0, 1179, 2556), 540, p)
