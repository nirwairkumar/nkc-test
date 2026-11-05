"""Put a real TestoZa screen recording onto a blank screen in a Veo shot.

    python tools/screen_comp.py --bg gen/veo/lab-screen-v1.mp4 --ui assets/ui/_lab-ui.mp4 \
        --roi 900,150,1900,900 --out assets/shots/lab-screen.mp4 [--debug dbg.jpg]

1. Frame 0: the screen is the largest bright, low-saturation region inside --roi, separated from
   the wall by its dark bezel; its four corners are the extreme points along the diagonals,
   refined to sub-pixel.
2. Every later frame: ECC homography against frame 0 (masked to the screen plus bezel), so the
   corners follow the camera's drift; corner paths are smoothed.
3. The UI frame is warped into the quad, lit by the screen's own luminance (so gradients and
   falloff stay), softened to the footage's sharpness, and given the same grain.
"""
import argparse
import subprocess

import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--bg', required=True)
ap.add_argument('--ui', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--roi', required=True)
ap.add_argument('--inset', type=float, default=1.0, help='shrink the quad by N px (bezel edge)')
ap.add_argument('--soft', type=float, default=0.7, help='gaussian sigma applied to the warped UI')
ap.add_argument('--gain', type=float, default=0.96, help='UI brightness relative to the screen')
ap.add_argument('--flat-light', action='store_true', help='UI already carries the scene light (a flattened still): gain only')
ap.add_argument('--track', default='ring', choices=['ring', 'inside'],
                help='ring: features around a blank screen; inside: features of the content on the screen (rigid, no parallax)')
ap.add_argument('--occluder-right', action='store_true',
                help='a darker cubicle partition may slide in front of the screen from the right (camera push past it)')
ap.add_argument('--debug', default='')
a = ap.parse_args()

bg = cv2.VideoCapture(a.bg)
frames = []
while True:
    ok, f = bg.read()
    if not ok:
        break
    frames.append(f)
H, W = frames[0].shape[:2]
ui = cv2.VideoCapture(a.ui)
uis = []
while True:
    ok, f = ui.read()
    if not ok:
        break
    uis.append(f)
assert uis, 'empty ui clip'

x0, y0, x1, y1 = map(int, a.roi.split(','))


def blob(img, thr):
    """Largest filled bright blob inside the roi that does not touch the roi edge, or None."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    v, s = hsv[..., 2], hsv[..., 1]
    m = ((v > thr) & (s < 45)).astype(np.uint8) * 255
    m[:y0], m[y1:], m[:, :x0], m[:, x1:] = 0, 0, 0, 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    best = None
    for c in cnts:
        area = cv2.contourArea(c)
        if area < 0.02 * W * H:
            continue
        x, y, w, h = cv2.boundingRect(c)
        # a screen is a filled, roughly rectangular blob that does not touch the roi edge
        if area / (w * h) < 0.78 or x <= x0 + 2 or y <= y0 + 2 or x + w >= x1 - 2 or y + h >= y1 - 2:
            continue
        if best is None or area > cv2.contourArea(best):
            best = c
    return best


def corners(c):
    """Corners of a quadrilateral blob: split its outline into four sides at the diagonal
    extremes, fit a line to each side, intersect neighbouring lines (sub-pixel, robust to
    the rounded corners morphology leaves)."""
    pts = c.reshape(-1, 2).astype(np.float32)
    # walk the outline tl -> tr -> br -> bl (positive shoelace area with y pointing down)
    if np.sum(pts[:, 0] * np.roll(pts[:, 1], -1) - np.roll(pts[:, 0], -1) * pts[:, 1]) < 0:
        pts = pts[::-1].copy()
    sm, df = pts.sum(1), pts[:, 0] - pts[:, 1]
    idx = [int(sm.argmin()), int(df.argmax()), int(sm.argmax()), int(df.argmin())]  # tl tr br bl
    n = len(pts)
    lines = []
    for k in range(4):
        i0, i1 = idx[k], idx[(k + 1) % 4]
        seg = pts[i0:i1 + 1] if i0 <= i1 else np.vstack([pts[i0:], pts[:i1 + 1]])
        trim = max(2, len(seg) // 8)  # drop the rounded ends
        seg = seg[trim:-trim] if len(seg) > 4 * trim else seg
        vx, vy, px, py = cv2.fitLine(seg, cv2.DIST_HUBER, 0, 0.01, 0.01).ravel()
        lines.append((px, py, vx, vy))
    quad = []
    for k in range(4):  # corner k sits between side k-1 and side k
        (ax, ay, adx, ady), (bx, by, bdx, bdy) = lines[k - 1], lines[k]
        A = np.array([[adx, -bdx], [ady, -bdy]])
        t = np.linalg.solve(A, np.array([bx - ax, by - ay]))[0]
        quad.append((ax + adx * t, ay + ady * t))
    return np.array(quad, np.float32)


# frame 0: the lowest threshold that still isolates the screen takes in its darker corners
thr, c0 = None, None
for t in (165, 175, 185, 195, 205, 215):
    c = blob(frames[0], t)
    if c is not None:
        thr, c0 = t, c
        break
if c0 is None:
    raise SystemExit('screen not found in roi')

q_first = corners(c0)
# track the screen's surroundings (bezel, monitor body) from frame 0 with pyramidal LK, then a
# RANSAC homography per frame maps the frame-0 quad onto that frame
g0 = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)
ring = np.zeros_like(g0)
cv2.fillConvexPoly(ring, q_first.astype(np.int32), 255)
if a.track == 'inside':
    ring = cv2.erode(ring, np.ones((25, 25), np.uint8))
else:
    ring = cv2.dilate(ring, np.ones((81, 81), np.uint8)) - cv2.erode(ring, np.ones((9, 9), np.uint8))
p0 = cv2.goodFeaturesToTrack(g0, 400, 0.01, 6, mask=ring)
quads, misses, guess = [q_first], 0, p0.copy()
for f in frames[1:]:
    gi = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
    p1, st, _ = cv2.calcOpticalFlowPyrLK(g0, gi, p0, guess.copy(), winSize=(31, 31), maxLevel=3,
                                         flags=cv2.OPTFLOW_USE_INITIAL_FLOW)
    ok = st.ravel() == 1
    Hm = None
    if ok.sum() >= 12:
        Hm, _ = cv2.findHomography(p0[ok], p1[ok], cv2.RANSAC, 1.5)
    if Hm is None:
        misses += 1
        quads.append(quads[-1])
        continue
    guess = np.where(ok[:, None, None], p1, guess)
    quads.append(cv2.perspectiveTransform(q_first.reshape(-1, 1, 2), Hm).reshape(4, 2))
quads = np.array(quads, np.float32)
raw = [None] * misses
k = 5
pad = np.pad(quads, ((k // 2, k // 2), (0, 0), (0, 0)), mode='edge')
quads = np.stack([pad[i:i + k].mean(0) for i in range(len(quads))])
# pull each corner toward the centre by the inset so no bezel shows between UI and frame
cen = quads.mean(1, keepdims=True)
quads = quads + (cen - quads) / np.linalg.norm(cen - quads, axis=2, keepdims=True) * a.inset
q0 = quads[0]
drift = np.abs(quads - quads[0]).max()
print('frame 0 quad (tl tr br bl):', np.round(q0, 1).tolist(), 'threshold', thr)
print(f'frames {len(frames)}, misses {sum(r is None for r in raw)}, max corner drift {drift:.2f} px')

post_x = np.full(len(frames), float(W))
if a.occluder_right:
    # the partition's left edge, found in the strip of wall just above the screen (nothing else
    # there): the strongest bright-to-dark fall with a clearly darker band right of it
    for i, f in enumerate(frames):
        q = quads[i]
        top = int(min(q[0][1], q[1][1]))
        ya, yb = max(0, top - 170), max(2, top - 15)
        xa = int(q[:, 0].min() + 0.25 * (q[:, 0].max() - q[:, 0].min()))
        band = cv2.GaussianBlur(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)[ya:yb, xa:].astype(np.float32), (0, 0), 1.5)
        gx = cv2.Sobel(band, cv2.CV_32F, 1, 0, ksize=3).mean(axis=0)
        level = band.mean(axis=0)
        # the leftmost strong fall is the partition's boundary (its fabric has edges further right)
        for j in np.where(gx < -8)[0]:
            after, before = level[j + 4:j + 40], level[max(0, j - 40):max(1, j - 4)]
            if after.size > 10 and before.size > 10 and after.mean() < before.mean() - 15:
                post_x[i] = xa + j
                break
    med = np.array([np.median(post_x[max(0, i - 4):i + 5]) for i in range(len(post_x))])
    post_x = np.array([med[max(0, i - 2):i + 3].mean() for i in range(len(med))])
    seen = post_x < W - 1
    print(f'occluder in {seen.sum()} frames, first at frame {int(np.argmax(seen)) if seen.any() else "-"}, '
          f'x {post_x[seen].min():.0f}-{post_x[seen].max():.0f}' if seen.any() else 'occluder not found')
xs = np.arange(W, dtype=np.float32)

if a.debug:
    k = len(frames) - 1
    d = frames[k].copy()
    cv2.polylines(d, [quads[k].astype(np.int32)], True, (0, 0, 255), 2)
    if post_x[k] < W:
        cv2.line(d, (int(post_x[k]), 0), (int(post_x[k]), H), (0, 255, 0), 2)
    cv2.imwrite(a.debug, d)

ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '24',
                       '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', a.out],
                      stdin=subprocess.PIPE)
rng = np.random.default_rng(7)
for i, f in enumerate(frames):
    u = uis[min(i, len(uis) - 1)]
    uh, uw = u.shape[:2]
    src = np.array([[0, 0], [uw, 0], [uw, uh], [0, uh]], np.float32)
    M = cv2.getPerspectiveTransform(src, quads[i].astype(np.float32))
    warped = cv2.warpPerspective(u, M, (W, H), flags=cv2.INTER_AREA if uw > 1.5 * (quads[i][1][0] - quads[i][0][0]) else cv2.INTER_CUBIC)
    m = cv2.warpPerspective(np.full((uh, uw), 255, np.uint8), M, (W, H), flags=cv2.INTER_LINEAR).astype(np.float32) / 255
    if post_x[i] < W - 1:
        m *= np.clip((post_x[i] + 1.5 - xs) / 3.0, 0, 1)[None, :]  # stay behind the post
    if a.soft > 0:
        warped = cv2.GaussianBlur(warped, (0, 0), a.soft)
    # the screen's own light: its luminance, heavily blurred, normalised to its bright level
    small = cv2.resize(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (W // 4, H // 4), interpolation=cv2.INTER_AREA).astype(np.float32)
    lum = cv2.resize(cv2.GaussianBlur(small, (0, 0), 6), (W, H), interpolation=cv2.INTER_LINEAR)
    inside = m > 0.99
    ref = np.percentile(lum[inside], 90) if inside.any() else 255
    light = np.full_like(lum, a.gain) if a.flat_light else np.clip(lum / max(ref, 1), 0.6, 1.08) * a.gain
    uif = warped.astype(np.float32) * light[..., None]
    uif += rng.normal(0, 2.2, uif.shape).astype(np.float32)  # same grain as the footage
    out = f.astype(np.float32) * (1 - m[..., None]) + uif * m[..., None]
    ff.stdin.write(np.clip(out, 0, 255).astype(np.uint8).tobytes())
ff.stdin.close()
ff.wait()
print('wrote', a.out)
