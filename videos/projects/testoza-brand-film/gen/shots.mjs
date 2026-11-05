// Stills for "First Time", the TestoZa brand film. One entry per frame; gen/img.mjs
// appends the cast descriptions and LOOK. Every take is kept (img/<id>-v<n>.png).

export const LOOK = `Style: a photorealistic still frame from a premium cinematic television commercial made for India, in the visual language of Apple's brand films: real people in real places, quiet emotion, restraint. Shot on an ARRI Alexa 35 with Cooke S4/i prime lenses; natural, motivated light; soft contrast with gentle highlight roll-off; true-to-life Indian skin tones; fine natural film grain; shallow depth of field with creamy bokeh where noted. Clean, uncluttered, authentic Indian production design. People look dignified and real, never glamorised or stereotyped. No captions, overlay graphics, watermarks, or brand logos. Correct anatomy, natural hands with five fingers, natural faces in the background.`;

export const CAST = {
  priya: {
    ref: 'ref-priya',
    text: `Priya (keep her face, hair and clothes exactly as in the reference portrait of her): a 22-year-old Indian woman preparing for government job exams; warm wheatish-brown skin; long black hair in a neat single braid with a few loose strands at her temples; expressive dark eyes, natural eyebrows; a tiny gold stud nose pin and small gold stud earrings; no-makeup look; a simple soft-teal cotton kurta with three-quarter sleeves; a thin black-strap wristwatch on her left wrist.`,
  },
  verma: {
    ref: 'ref-verma',
    text: `Verma Sir (keep his face, hair, spectacles and clothes exactly as in the reference portrait of him): a 46-year-old Indian man who runs a small coaching institute for government exams; medium-brown skin; short salt-and-pepper hair; a neatly trimmed salt-and-pepper moustache; thin rimless rectangular spectacles; kind, tired eyes with laugh lines; a pale-blue half-sleeve formal cotton shirt with a red ballpoint pen clipped in the chest pocket; dark grey trousers; a simple steel-strap wristwatch.`,
  },
};

export const SHOTS = {
  // ── casting references ────────────────────────────────────────────────
  'ref-priya': {
    prompt: `Casting reference portrait for a television commercial. Head-and-shoulders portrait of the woman described below, turned slightly to a three-quarter angle and looking just off camera, calm and thoughtful. Soft north-facing window light from the left, plain warm light-grey studio backdrop, 85mm lens, natural skin texture with pores, no retouching.\n\n${CAST.priya.text.replace(/^Priya \(keep[^)]*\): /, 'The woman: ')}`,
  },
  'ref-verma': {
    prompt: `Casting reference portrait for a television commercial. Head-and-shoulders portrait of the man described below, turned slightly to a three-quarter angle and looking just off camera, gentle and patient. Soft north-facing window light from the left, plain warm light-grey studio backdrop, 85mm lens, natural skin texture with pores, no retouching.\n\n${CAST.verma.text.replace(/^Verma Sir \(keep[^)]*\): /, 'The man: ')}`,
  },

  // ── 1. the exam hall (hook) ───────────────────────────────────────────
  'exam-hall': {
    cast: ['priya'],
    prompt: `Inside a modern Indian computer-based-test examination centre, early morning. A long row of identical black desktop computers in grey fabric-partitioned cubicles recedes into depth; cool white overhead LED panels; pale grey walls; a small CCTV dome camera on the ceiling far away. In the foreground, framed from behind over her right shoulder at a slight angle, Priya sits very upright at her terminal, her right hand resting on a mouse. Her monitor fills the right third of the frame, sharp and clearly visible: a plain online exam interface. Its text must be exactly this and nothing else: a thin header bar reading "Quantitative Aptitude" on the left and "Time Left 59:58" on the right; the question "Q.1 A train 150 m long passes a pole in 15 seconds. Find its speed in km/h."; four radio-button options "30", "36", "40", "45"; on the right, a small grid of numbered grey question buttons 1 to 25. Further down the row other candidates sit in their cubicles, out of focus. An invigilator in a dark blazer stands far in the background. Mood: hushed, clinical, high stakes. Colour: cool cyan-white light, slightly desaturated. 35mm lens at seated eye level, static camera.`,
  },
  'priya-nervous': {
    cast: ['priya'],
    prompt: `Close-up of Priya's face in three-quarter profile as she sits at a computer terminal in the examination centre, lit mainly by the cool blue-white glow of her monitor just off-screen to the right, with soft overhead light; the row of cubicles behind her falls into soft, out-of-focus depth. Her lips are pressed together and she is nervous: eyes scanning the screen, a faint crease between her brows, a loose strand of hair by her cheek. 85mm lens, very shallow depth of field, eye level, static camera.`,
  },

  // ── 2. the paper world ────────────────────────────────────────────────
  photocopier: {
    prompt: `Close-up of the output tray of a well-used office photocopier in the cramped print room of a small coaching institute. Warm tungsten light from a bare bulb; dust motes floating in the light. Freshly printed A4 sheets of a typed question paper (dense small black text in two columns, the heading "WEEKLY TEST" at the top) are sliding out and piling up. Beside the machine, bundles of printed question papers tied with white string are stacked on a scuffed wooden table. 50mm lens at tray height, shallow depth of field. Mood: the same tired routine, every week. Colour: warm amber against deep shadow.`,
  },
  'paper-class': {
    cast: ['verma'],
    prompt: `A traditional coaching classroom in a north Indian town during a weekly written test, daytime but dim. Rows of long wooden benches with about twenty-five young adult students (men and women aged about 20 to 24, in simple everyday clothes) bent over printed question papers and OMR answer sheets, writing with pens. Fluorescent tube lights, two ceiling fans, pale green walls, a green chalkboard with the date written in chalk. Verma Sir walks slowly down the aisle between the benches with his hands clasped behind his back, invigilating. Window light from the left. Muted, slightly desaturated colours. Wide shot from the back corner of the room, 28mm lens, eye level.`,
  },
  'night-check': {
    cast: ['verma'],
    prompt: `Late at night in a modest Indian home. Verma Sir sits alone at a small wooden study desk against the wall, checking answer sheets by hand in the warm pool of light from an old table lamp. A tall stack of unchecked answer sheets on his left, a smaller checked stack on his right; he is marking a red tick with a red ballpoint pen. On the desk: a steel tumbler of cold tea, a printed answer key, a calculator. On the wall above the desk a round wall clock shows twenty to two. The rest of the room is in dark blue night; through a doorway behind him, out of focus, a dim bedroom where his family sleeps. He looks exhausted; his spectacles have slipped down his nose. Medium shot from the side and slightly behind, 40mm lens. Colour: warm tungsten lamp against cool blue darkness.`,
  },
  'red-pen': {
    cast: ['verma'],
    prompt: `Extreme close-up under warm lamp light at night: Verma Sir's hand (steel-strap wristwatch on the wrist) holds a red ballpoint pen and marks a red cross beside a handwritten answer on a ruled answer sheet; near the top of the sheet a total "38/100" is written in red and circled. Beneath it, the edges of a thick pile of answer sheets. Macro lens, very shallow depth of field.`,
  },
  'notice-board': {
    prompt: `A narrow corridor of a small coaching institute, daytime. A cork notice board with a printed results list pinned with drawing pins: a typed table headed "WEEKLY TEST RESULT" with many rows of student names, roll numbers and marks. Five young adult students crowd in front of it, leaning in; a young woman runs her finger down the list searching for her name. Mixed fluorescent and daylight, slightly desaturated. 35mm lens, over the shoulders of the students from behind.`,
  },
  copying: {
    prompt: `Close-up during a written test in a dim traditional coaching classroom: a young Indian man of about 21 at a wooden bench, pen in hand, his eyes sliding sideways toward his neighbour's OMR answer sheet; the neighbour's arm and sheet are soft and out of focus in the foreground. Flat fluorescent light, muted colours. 85mm lens, focus on his eyes.`,
  },
  dawn: {
    cast: ['verma'],
    prompt: `Dawn in the same modest Indian home. Verma Sir stands at an open window with iron grills, holding a steel tumbler of tea, looking out at the city waking up. The first warm sunlight touches his face while the room behind him is still blue. Behind him, out of focus, the study desk with the finished stacks of answer sheets. He looks thoughtful, as if he is deciding something. Medium close-up from the side, 50mm lens.`,
  },

  // ── 3. the shift ──────────────────────────────────────────────────────
  laptop: {
    cast: ['verma'],
    prompt: `Morning in the small, clean office of a coaching institute: white walls, a wooden desk by a large window with soft daylight, a potted money plant. Seen from his left side, Verma Sir sits at the desk in soft profile and opens a silver laptop; beside it lies a printed question paper. The laptop screen is angled away from the camera; its soft glow touches his face. He looks calm and thoughtful. Medium shot from the side, 50mm lens, shallow depth of field, the window light behind him.`,
  },
  'board-code': {
    cast: ['verma'],
    noBrandRule: true,
    prompt: `A bright, modern classroom of an Indian coaching institute in morning sunlight. Verma Sir stands at a clean white whiteboard, having just written in neat blue marker handwriting three lines: "Weekly Mock 12", below it "testoza.com/join", and below that, large, the code "846 331". He turns toward the class with a slight smile, the marker still in his hand. In the out-of-focus foreground, the backs of students' heads and one raised hand holding a smartphone. 35mm lens, eye level. The handwritten text on the board must be exactly as given and clearly legible.`,
  },
  'class-phones': {
    cast: ['verma'],
    prompt: `A bright, modern classroom of an Indian coaching institute in soft morning sunlight streaming through tall windows on the left; white walls, light wooden desks in neat rows. About thirty young adult students (men and women aged 20 to 24 in simple everyday Indian clothes: cotton kurtas, collared shirts, plain t-shirts) sit upright and absorbed, each holding a smartphone in one hand at a comfortable angle, with a rough sheet of paper covered in handwritten working and a pencil on the desk in front of them. Everyone is calm and focused on a test on their phone. Verma Sir stands at the front beside the whiteboard, watching quietly. Wide, nearly symmetrical shot from the front corner at a slight high angle, 28mm lens; warm sunlight and faint cool reflections from phone screens on faces.`,
  },
  'priya-phone': {
    cast: ['priya'],
    prompt: `Close-up in the same bright classroom: Priya sits at a light wooden desk. On the desk, a rough sheet with neat handwritten working (fractions and percentages) and a yellow pencil. She holds a smartphone in her left hand, its screen glowing softly toward her (screen content not visible to the camera), and with her right index finger she taps an answer. Her expression is focused and calm. Soft morning sunlight from the left, shallow depth of field, 50mm lens, slightly high angle.`,
  },
  'lab-wide': {
    cast: ['verma'],
    prompt: `A clean, modern computer lab in an Indian coaching institute: two long rows of desktop computers on white desks along both sides of a central aisle, about twenty young adult students seated and focused on a mock test on their screens, in simple everyday clothes; large windows with soft daylight through sheer white curtains; light grey floor. Verma Sir, seen from behind, walks slowly away from the camera down the central aisle with his hands clasped behind his back, watching over the students. One-point perspective down the aisle, 24mm lens, eye level.`,
  },
  'lab-screen': {
    prompt: `Over-the-shoulder shot in a clean, modern computer lab: a young Indian man of about 22 in a white t-shirt sits at a desktop computer; his left shoulder and the side of his head are soft in the left foreground. The monitor sits in the right half of the frame, square-on to the camera, fully visible and unobstructed, all four corners of the screen clearly visible, the screen showing a plain, evenly lit, very light grey surface with nothing on it. Beside the keyboard, a rough sheet with handwritten calculations and a pencil. Soft daylight from the left. 50mm lens, static camera.`,
  },
  'class-result': {
    cast: ['priya'],
    prompt: `Use the classroom in the last reference image (same bright modern room, white walls, tall windows on the left, light wooden desks). After the test: Priya looks at her phone screen and breaks into a small, proud smile; the young woman beside her leans in to look at Priya's phone and smiles too. Warm morning sunlight; in the soft background, other young adult students (aged 20 to 24, everyday clothes, no school uniforms) look at their phones. Medium two-shot, 50mm lens, shallow depth of field.`,
  },
  'teacher-result': {
    cast: ['verma'],
    prompt: `Use the office in the last reference image (same clean white walls, same wooden desk by the large window, same potted money plant). Late morning: Verma Sir leans back in his chair in front of his laptop (screen facing away from the camera, its light on his face), reading results with a quiet, satisfied smile, one hand at his chin. On the desk, his red pen lies capped beside a closed register. Soft daylight from the window, a potted money plant. Medium shot, 50mm lens.`,
  },
  'pen-down': {
    cast: ['verma'],
    prompt: `Close-up at golden hour: Verma Sir's hand (steel-strap wristwatch on the wrist) places his red ballpoint pen into a simple white ceramic pen stand on a clean wooden desk. Warm, low sunlight streaks across the desk. Shallow depth of field, 85mm lens.`,
  },
  dinner: {
    cast: ['verma'],
    prompt: `Night in the same modest Indian home, now warm and lively: Verma Sir sits at a small dining table with his wife (a woman of about 44 in a simple cotton salwar suit) and his elderly mother, eating dinner and laughing at something his wife has said; steel plates, rotis, dal and sabzi; warm tungsten light. In the soft-focus background, his study desk by the wall is clear and tidy, its table lamp switched off. Medium-wide shot, 35mm lens, eye level. Mood: warm, relieved, human.`,
  },

  // ── 4. exam day, again ────────────────────────────────────────────────
  'exam-calm': {
    cast: ['priya'],
    prompt: `Recreate the first reference image exactly: the same examination centre, the same row of cubicles, the same camera position and framing over Priya's right shoulder, the same monitor with the exam interface and the countdown timer reading 59:58. Change only Priya's body language and the light: she now sits relaxed and confident, shoulders easy, her right hand resting lightly on the mouse, ready to begin; the light is a touch warmer and brighter. Static camera.`,
  },
  'priya-calm': {
    cast: ['priya'],
    prompt: `Recreate the first reference image exactly: the same close-up framing of Priya's face in three-quarter profile at the exam terminal, the same cool monitor light and soft background. Change only her expression: she is now calm and composed, with the slightest confident smile at the corner of her lips, eyes steady on the screen. Static camera.`,
  },
};

SHOTS['exam-hall-fix'] = {
  cast: ['priya'],
  prompt: `Edit the first reference image. Keep everything exactly the same (framing, room, light, people, the monitor and all its text) except two things: 1) the grid of numbered question buttons on the monitor must read 1 to 25 in order with no repeated numbers, five rows of four plus 25 alone is fine; 2) Priya's hair is in a single long braid hanging down her back, as in her reference portrait.`,
  noLook: true,
};

// Veo refuses frames where Verma Sir's face reads as a look-alike (support code 29310472),
// so these two are staged without his face.
SHOTS['laptop-hands'] = {
  prompt: `Close-up at a wooden desk by a large window in a clean white office, soft morning daylight. Verma Sir's hands and forearms only (a simple steel-strap wristwatch on the left wrist, the cuff of a pale-blue half-sleeve shirt) open the lid of a silver laptop; beside it lies a printed question paper with the typed heading "WEEKLY MOCK 12". A potted money plant at the edge of the frame. His face is not in the frame. Shallow depth of field, 50mm lens, slightly high angle.`,
};
SHOTS['teacher-ots'] = {
  prompt: `Over-the-shoulder shot from behind a man's right shoulder in a clean white office by a large window: his head and shoulder (short salt-and-pepper hair, pale-blue half-sleeve shirt) are soft in the left foreground; his face is not visible. He sits at a wooden desk; a silver laptop stands in the right half of the frame, its screen square-on to the camera, fully visible and unobstructed, all four corners of the screen clearly visible, the screen showing a plain, evenly lit, very light grey surface with nothing on it. A red pen lies capped on a closed register beside the laptop; a potted money plant on the windowsill. Soft daylight. 50mm lens, static camera.`,
};
