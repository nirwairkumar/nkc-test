// Presenter photo for the corner avatar: an original AI-generated teacher in a TestoZa studio
// (Gemini image model on Vertex, with the real logo as a reference). Writes assets/avatar/still-<n>.png.
// Usage: GEMINI_API_KEY=… node capture/avatar-image.mjs [count] [extra direction]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const OUT = ROOT + 'assets/avatar/';
mkdirSync(OUT, { recursive: true });
const count = Number(process.argv[2] || 3);
const extra = process.argv[3] || '';
const key = process.env.GEMINI_API_KEY;
const MODEL = process.env.TZ_IMAGE_MODEL || 'gemini-2.5-flash-image';
const url = key.startsWith('AIza')
  ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  : `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent`;
const logo = readFileSync(ROOT + '../../../frontend/public/logo-testoza-square.png').toString('base64');

const prompt = `Photorealistic portrait photograph, square 1:1, shot on a full-frame camera with an 85mm lens.
A friendly Indian woman, about 28 years old, a school teacher who presents online tutorials. Natural, warm,
approachable, a gentle closed-mouth smile, looking straight into the camera. Head and shoulders, face centred
in the frame and filling about a third of its height, a little headroom. Neat dark hair, simple smart-casual
top in a soft muted colour, small earrings, natural makeup. Real skin texture, not airbrushed.
She sits in a modern, softly lit tutorial recording studio: a deep navy wall with subtle acoustic panels,
warm practical lights, a soft out-of-focus bookshelf. On the wall behind her, slightly above and to one side
of her head, the attached logo appears as a glowing backlit acrylic sign, exactly the same lettering and
colours: "Testo" in sky blue and a gold "Z" and sky-blue "a". The sign is clearly readable but slightly soft
from depth of field and does not touch her head. Gentle rim light on her hair. Calm, premium, professional.
No other text anywhere. ${extra}`;

for (let i = 1; i <= count; i++) {
  const body = {
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/png', data: logo } }, { text: prompt }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1' } },
  };
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  const img = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!img) { console.error(`✗ ${i}: HTTP ${res.status} ${JSON.stringify(json.error ?? json).slice(0, 300)}`); continue; }
  const file = `${OUT}still-${i}.png`;
  writeFileSync(file, Buffer.from(img.data, 'base64'));
  console.log('✓', file);
}
