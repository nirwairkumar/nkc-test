// Hindi dub text, shared by vo-gemini.mjs (what the voice reads) and dub-hi.mjs (word timings).
// The script keeps what the screen shows (TestoZa, XeO3, List-I…); the voice gets these words.
// Longer formulas first, so XeO2F2 is not read as XeO + 2F2.
const SAY = [
  [/testoza\.com/gi, 'टेस्टोज़ा डॉट कॉम'], [/TestoZa/g, 'टेस्टोज़ा'], [/Sy Pad/g, 'साई पैड'], [/2026/g, 'ट्वेंटी-ट्वेंटी-सिक्स'],
  [/ & /g, ' ऐंड '], [/\bPaper 1\b/g, 'पेपर वन'], [/List-II/g, 'लिस्ट टू'], [/List-I/g, 'लिस्ट वन'],
  [/\bXeO2F2\b/g, 'एक्स-ई-ओ-टू-एफ़-टू'], [/\bXeOF4\b/g, 'एक्स-ई-ओ-एफ़-फ़ोर'], [/\bXeO3\b/g, 'एक्स-ई-ओ-थ्री'], [/\bXeF2\b/g, 'एक्स-ई-एफ़-टू'],
  [/\bBrF5\b/g, 'बी-आर-एफ़-फ़ाइव'], [/\bNH3\b/g, 'एन-एच-थ्री'], [/\bSF4\b/g, 'एस-एफ़-फ़ोर'], [/\bI3\b/g, 'आई-थ्री'], [/\bH2O\b/g, 'एच-टू-ओ'],
  [/\bM n, B r\b/g, 'एम-एन, बी-आर'], [/\bK a, K b\b/g, 'के-ए, के-बी'], [/\bcaret\b/g, 'कैरेट'],
  [/\b573\b/g, 'पाँच सौ तिहत्तर'], [/\bU-235\b/g, 'यूरेनियम दो सौ पैंतीस'],
  // The voice tends to drop a lone English letter that ends a sentence ("सही जवाब D।").
  [/\b([ABCD])।/g, (_, l) => ({ A: 'ए', B: 'बी', C: 'सी', D: 'डी' })[l] + '।'],
];
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
