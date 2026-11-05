"""Flatten the screen of a still into a rectangle, to composite back onto moving footage
of the same screen (tools/screen_comp.py) so its text stays exact while Veo animates the room.

    python tools/rectify.py --still gen/img/exam-hall-v3.png --roi 1250,250,1900,880 --out assets/img/cbt-screen.png

The still is first scaled exactly as gen/veo.mjs feeds Veo (16:9 crop, 1920x1080), so the screen
found here is the same region screen_comp.py finds in the footage.
"""
import argparse

import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--still', required=True)
ap.add_argument('--roi', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--thr', type=int, default=0, help='brightness threshold (0 = auto)')
a = ap.parse_args()

img = cv2.imread(a.still)
h, w = img.shape[:2]
cw, ch = min(w, int(h * 16 / 9)), min(h, int(w * 9 / 16))
img = img[(h - ch) // 2:(h - ch) // 2 + ch, (w - cw) // 2:(w - cw) // 2 + cw]
img = cv2.resize(img, (1920, 1080), interpolation=cv2.INTER_AREA)
x0, y0, x1, y1 = map(int, a.roi.split(','))
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

best = None
for thr in ([a.thr] if a.thr else (215, 205, 195, 185, 175, 165)):
    m = ((hsv[..., 2] > thr) & (hsv[..., 1] < 45)).astype(np.uint8) * 255
    m[:y0], m[y1:], m[:, :x0], m[:, x1:] = 0, 0, 0, 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    for c in cnts:
        area = cv2.contourArea(c)
        x, y, bw, bh = cv2.boundingRect(c)
        if area < 0.01 * 1920 * 1080 or area / (bw * bh) < 0.78:
            continue
        if x <= x0 + 2 or y <= y0 + 2 or x + bw >= x1 - 2 or y + bh >= y1 - 2:
            continue
        if best is None or area > best[0]:
            best = (area, c, thr)
    if best:
        break
if not best:
    raise SystemExit('screen not found')
pts = best[1].reshape(-1, 2).astype(np.float32)
if np.sum(pts[:, 0] * np.roll(pts[:, 1], -1) - np.roll(pts[:, 0], -1) * pts[:, 1]) < 0:
    pts = pts[::-1].copy()
sm, df = pts.sum(1), pts[:, 0] - pts[:, 1]
q = np.array([pts[sm.argmin()], pts[df.argmax()], pts[sm.argmax()], pts[df.argmin()]], np.float32)
# output size: the quad's longest top/bottom and left/right edges, upscaled 2x for a crisp source
W = int(max(np.linalg.norm(q[1] - q[0]), np.linalg.norm(q[2] - q[3])) * 2)
H = int(max(np.linalg.norm(q[3] - q[0]), np.linalg.norm(q[2] - q[1])) * 2)
M = cv2.getPerspectiveTransform(q, np.array([[0, 0], [W, 0], [W, H], [0, H]], np.float32))
flat = cv2.warpPerspective(img, M, (W, H), flags=cv2.INTER_CUBIC)
cv2.imwrite(a.out, flat)
print('quad', np.round(q, 1).tolist(), 'threshold', best[2], '->', a.out, f'{W}x{H}')
