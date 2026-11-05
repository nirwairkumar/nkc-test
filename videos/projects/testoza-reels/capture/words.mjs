// Script tokens ↔ heard words (Parakeet timings). Gives every script token a start time and every
// {cue} its moment, even where the recogniser heard "Testosa" or "27" for "TestoZa" or "twenty-seven".
export const norm = (w) => w.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');

/** Tokens of the raw script text: { display, parts (normalised, hyphen-split), cues }. */
export function scriptTokens(raw) {
  const out = []; let pending = [];
  for (const tok of raw.split(/\s+/).filter(Boolean)) {
    const cues = [...tok.matchAll(/\{([a-z0-9]+)\}/gi)].map((m) => m[1]);
    const display = tok.replace(/\{[a-z0-9]+\}/gi, '');
    pending.push(...cues);
    if (!display) continue;
    const parts = display.replace(/TestoZa/g, 'Testoza').split(/[-—–…]+/).map(norm).filter(Boolean);
    out.push({ display, parts, cues: pending });
    pending = [];
  }
  if (pending.length) out.push({ display: '', parts: [], cues: pending, tail: true });
  return out;
}

function levenshteinMap(a, b) {
  const n = a.length, m = b.length, D = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = 0; i <= n; i++) D[i][0] = i;
  for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  const map = new Array(n).fill(-1);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (D[i][j] === D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { map[i - 1] = j - 1; i--; j--; }
    else if (D[i][j] === D[i - 1][j] + 1) i--;
    else j--;
  }
  return map;
}

/** Timed tokens for one line: each token gets start/end (seconds into the clip); cues → times. */
export function timeLine(raw, heard, duration) {
  const toks = scriptTokens(raw);
  const flat = []; toks.forEach((t, ti) => t.parts.forEach((p, pi) => flat.push({ p, ti, first: pi === 0 })));
  const hw = heard.flatMap((h) => h.text.split(/[-—–]+/).map((p) => ({ w: norm(p), start: h.start, end: h.end }))).filter((x) => x.w);
  const map = levenshteinMap(flat.map((x) => x.p), hw.map((x) => x.w));
  // Token start = its first matched part; unmatched tokens are interpolated between neighbours.
  toks.forEach((t) => { t.start = null; t.end = null; });
  flat.forEach((x, k) => {
    if (map[k] < 0) return;
    const t = toks[x.ti], h = hw[map[k]];
    if (t.start == null) t.start = h.start;
    t.end = Math.max(t.end ?? 0, h.end);
  });
  const real = toks.filter((t) => !t.tail);
  for (let i = 0; i < real.length; i++) {
    if (real[i].start != null) continue;
    let a = i - 1; while (a >= 0 && real[a].start == null) a--;
    let b = i + 1; while (b < real.length && real[b].start == null) b++;
    const ta = a >= 0 ? real[a].end : 0, tb = b < real.length ? real[b].start : duration;
    const span = b - a;
    real[i].start = ta + ((tb - ta) * (i - a - 0.5)) / span;
    real[i].end = real[i].start + 0.2;
  }
  const cues = {};
  for (const t of toks) for (const c of t.cues) cues[c] = t.tail ? duration : t.start;
  return { tokens: real, cues };
}
