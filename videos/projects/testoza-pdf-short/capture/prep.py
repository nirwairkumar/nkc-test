# Crops the real TestoZa screens in capture/ui/ to the regions the Short shows, resized to the
# exact size they display at (1:1 on the 1080x1920 canvas), into assets/ui/.
# Run from the project root with any Python that has Pillow: python capture/prep.py
from PIL import Image
import os

SRC, OUT = 'capture/ui', 'assets/ui'
os.makedirs(OUT, exist_ok=True)


def crop(name, box, width, out):
    im = Image.open(f'{SRC}/{name}.png').convert('RGB')
    x0, y0, x1, y1 = box
    y1 = min(y1, im.height)
    c = im.crop((x0, y0, x1, y1))
    h = round(c.height * width / c.width)
    c.resize((width, h), Image.LANCZOS).save(f'{OUT}/{out}.png', optimize=True)
    print(out, width, h)


W = 960  # window width on the canvas
STATES = ['processing-0', 'processing-1', 'processing-2', 'processing-3', 'processing-4', 'processing-done']
for i, s in enumerate(STATES):
    tag = 'done' if s.endswith('done') else str(i)
    crop(s, (56, 170, 816, 552), W, f'card-{tag}')          # progress card: title, %, elapsed, bar
    crop(s, (864, 130, 2330, 256), W, f'qhead-{tag}')       # sticky "Questions N · Arriving live" header
    crop(s, (864, 256, 2330, 99999), W, f'qcol-{tag}')      # the Questions list below it, full height

crop('upload-1', (440, 0, 1920, 1000), W, 'upload-1')
crop('upload-2', (440, 0, 1920, 1900), W, 'upload-2')
crop('preview', (40, 100, 2310, 1500), W, 'preview')
crop('mytests', (40, 0, 2320, 1000), W, 'mytests')
crop('toast-code', (0, 0, 720, 152), W, 'toast')
for p in ['phone-join-0', 'phone-join-1', 'phone-join-2', 'phone-join-3', 'phone-join-4', 'phone-join-5',
          'phone-join-6', 'phone-exam-0', 'phone-exam-1']:
    crop(p, (0, 0, 1179, 2556), 540, p)
