// Hindi dub text, shared by vo-gemini.mjs (what the voice reads) and dub-hi.mjs (word timings).
// The script keeps what the screen shows (TestoZa, testoza.com, 2027); the voice gets these words.
const SAY = [[/testoza\.com/gi, 'टेस्टोज़ा डॉट कॉम'], [/TestoZa/g, 'टेस्टोज़ा'], [/2027/g, 'दो हज़ार सत्ताईस'], [/NEET-UG/g, 'NEET UG'],
  [/Warn only/g, 'वॉर्न ओनली']];
export const say = (s) => SAY.reduce((t, [re, to]) => t.replace(re, to), s);

/** Tokens of one raw script line: { display, cues (the {cue}s just before it), said (spoken words) }. */
export function tokensHi(raw) {
  const out = []; let pending = [];
  for (const tok of raw.split(/\s+/).filter(Boolean)) {
    const cues = [...tok.matchAll(/\{([a-z0-9]+)\}/gi)].map((m) => m[1]);
    const display = tok.replace(/\{[a-z0-9]+\}/gi, '');
    pending.push(...cues);
    if (!display) continue;
    // A word counts as spoken when it has a letter or digit in it (not "—" or "…").
    const said = say(display).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
    out.push({ display, cues: pending, said });
    pending = [];
  }
  return out;
}

/** The text the voice reads for one raw line. */
export const spokenHi = (raw) => say(raw.replace(/\{[a-z0-9]+\}/gi, '')).replace(/[ \t]{2,}/g, ' ').trim();
