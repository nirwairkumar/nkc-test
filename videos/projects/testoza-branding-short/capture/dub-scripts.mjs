// Writes SCRIPT-<lang>.md for the five dub tracks (same ## Lnn ids and {cue}s, in the same order, as
// SCRIPT-en.md). App words stay English, as on screen. Never "free" in any language.
// Usage: node capture/dub-scripts.mjs
import { writeFileSync, readFileSync } from 'node:fs';
const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const NAME = { hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam' };
const L = {
  hi: [
    '{hook}आपके institute का logo और नाम — हर online test पर। {how}देखिए कैसे, step by step।',
    '{title}Test का नाम लिखिए, {branding}फिर Institution branding खोलिए।',
    '{logo}Logo डालिए, {name}institute का नाम लिखिए, {color}colour चुनिए, {font}font भी। {branded}बस — brand तैयार।',
    '{q1}अब questions — {right1}सही answer पर tap, अगला, {add3}और एक — सेकंडों में। {save}फिर Save।',
    '{conduct}फिर Conduct exam, {start}start कीजिए, {copy}link copy कीजिए — {code}या छह अंकों का join code भेजिए।',
    '{dopen}Students link खोलते हैं, {cname}अपना नाम लिखते हैं, {dgo}start करते हैं… {dbrand}और देखिए — आपका logo और नाम, सबसे ऊपर।',
    '{typecode}Phone पर? Code डालिए, {pgo}Start दबाइए, {pbrand}और आपका brand वहाँ भी। {ans1}हर question, आपके नाम के साथ।',
    '{endcard}आपका institute। आपका test। {endurl}आज ही बनाइए — testoza.com पर।',
  ],
  ta: [
    '{hook}உங்க institute-ஓட logo-வும் பேரும் — ஒவ்வொரு online test-லயும். {how}எப்படின்னு step by step பார்க்கலாம்.',
    '{title}Test பேர் வைங்க, {branding}Institution branding open பண்ணுங்க.',
    '{logo}Logo போடுங்க, {name}institute பேரை type பண்ணுங்க, {color}colour, {font}font தேர்ந்தெடுங்க. {branded}அவ்ளோதான் — brand ready.',
    '{q1}இப்போ questions — {right1}சரியான answer-ஐ tap பண்ணுங்க, அடுத்தது, {add3}இன்னொண்ணு. {save}அப்புறம் Save.',
    '{conduct}அப்புறம் Conduct exam, {start}start பண்ணுங்க, {copy}link-ஐ copy பண்ணுங்க — {code}இல்லனா ஆறு இலக்க join code அனுப்புங்க.',
    '{dopen}Students link-ஐ open பண்றாங்க, {cname}பேரை type பண்றாங்க, {dgo}start பண்றாங்க… {dbrand}பாருங்க — உங்க logo-வும் பேரும், மேலயே.',
    '{typecode}Phone-லயா? Code-ஐ type பண்ணி, {pgo}Start tap பண்ணா, {pbrand}அங்கயும் உங்க brand தான். {ans1}ஒவ்வொரு question-உம், உங்க பேர்ல.',
    '{endcard}உங்க institute. உங்க test. {endurl}இன்னைக்கே உருவாக்குங்க — testoza.com-ல.',
  ],
  te: [
    '{hook}మీ institute logo, పేరు — ప్రతి online test మీద. {how}ఎలాగో step by step చూద్దాం.',
    '{title}Test కి పేరు పెట్టి, {branding}Institution branding open చేయండి.',
    '{logo}Logo వేయండి, {name}institute పేరు type చేయండి, {color}colour, {font}font ఎంచుకోండి. {branded}అంతే — brand ready.',
    '{q1}ఇప్పుడు questions — {right1}సరైన answer tap చేయండి, తర్వాతది, {add3}ఇంకొకటి. {save}తర్వాత Save.',
    '{conduct}Conduct exam, {start}start, {copy}link copy చేయండి — {code}లేదా ఆరు అంకెల join code ఇవ్వండి.',
    '{dopen}Students link open చేస్తారు, {cname}పేరు type చేస్తారు, {dgo}start చేస్తారు… {dbrand}చూడండి — మీ logo, పేరు, పైనే.',
    '{typecode}Phone లోనా? Code type చేసి, {pgo}Start tap చేస్తే, {pbrand}అక్కడ కూడా మీ brand. {ans1}ప్రతి question, మీ పేరుతోనే.',
    '{endcard}మీ institute. మీ test. {endurl}ఈరోజే తయారు చేయండి — testoza.com లో.',
  ],
  kn: [
    '{hook}ನಿಮ್ಮ institute ನ logo ಮತ್ತು ಹೆಸರು — ಪ್ರತಿ online test ಮೇಲೆ. {how}ಹೇಗೆ ಅಂತ step by step ನೋಡೋಣ.',
    '{title}Test ಗೆ ಹೆಸರು ಕೊಟ್ಟು, {branding}Institution branding open ಮಾಡಿ.',
    '{logo}ನಿಮ್ಮ logo ಹಾಕಿ, {name}institute ಹೆಸರು type ಮಾಡಿ, {color}ಒಂದು colour, {font}ಒಂದು font ಆರಿಸಿ. {branded}ಅಷ್ಟೇ — ನಿಮ್ಮ brand ready.',
    '{q1}ಈಗ questions — {right1}ಸರಿಯಾದ answer tap ಮಾಡಿ, ಮುಂದಿನದು, {add3}ಇನ್ನೊಂದು. {save}ಆಮೇಲೆ Save.',
    '{conduct}Conduct exam, {start}start, {copy}link copy ಮಾಡಿ — {code}ಅಥವಾ ಆರು ಅಂಕಿಯ join code ಕಳಿಸಿ.',
    '{dopen}Students link open ಮಾಡ್ತಾರೆ, {cname}ಹೆಸರು type ಮಾಡ್ತಾರೆ, {dgo}start ಮಾಡ್ತಾರೆ… {dbrand}ನೋಡಿ — ನಿಮ್ಮ logo, ಹೆಸರು, ಮೇಲೆಯೇ.',
    '{typecode}Phone ನಲ್ಲಾ? Code type ಮಾಡಿ, {pgo}Start tap ಮಾಡಿದ್ರೆ, {pbrand}ಅಲ್ಲೂ ನಿಮ್ಮ brand. {ans1}ಪ್ರತಿ question, ನಿಮ್ಮ ಹೆಸರಿನಲ್ಲೇ.',
    '{endcard}ನಿಮ್ಮ institute. ನಿಮ್ಮ test. {endurl}ಇವತ್ತೇ ಮಾಡಿ — testoza.com ನಲ್ಲಿ.',
  ],
  ml: [
    '{hook}നിങ്ങളുടെ institute-ന്റെ logo-യും പേരും — ഓരോ online test-ലും. {how}എങ്ങനെയെന്ന് step by step നോക്കാം.',
    '{title}Test-ന് പേര് നൽകൂ, {branding}പിന്നെ Institution branding open ചെയ്യൂ.',
    '{logo}Logo ഇടൂ, {name}institute-ന്റെ പേര് type ചെയ്യൂ, {color}colour, {font}font തിരഞ്ഞെടുക്കൂ. {branded}അത്രേയുള്ളൂ — brand ready.',
    '{q1}ഇനി questions — {right1}ശരിയായ answer tap ചെയ്യൂ, അടുത്തത്, {add3}ഒന്നു കൂടി. {save}പിന്നെ Save.',
    '{conduct}പിന്നെ Conduct exam, {start}start ചെയ്യൂ, {copy}link copy ചെയ്യൂ — {code}അല്ലെങ്കിൽ ആറക്ക join code അയയ്ക്കൂ.',
    '{dopen}Students link open ചെയ്യുന്നു, {cname}പേര് type ചെയ്യുന്നു, {dgo}start ചെയ്യുന്നു… {dbrand}നോക്കൂ — നിങ്ങളുടെ logo-യും പേരും, ഏറ്റവും മുകളിൽ.',
    '{typecode}Phone-ലാണോ? Code type ചെയ്ത്, {pgo}Start tap ചെയ്താൽ, {pbrand}അവിടെയും നിങ്ങളുടെ brand. {ans1}ഓരോ question-ഉം, നിങ്ങളുടെ പേരിൽ.',
    '{endcard}നിങ്ങളുടെ institute. നിങ്ങളുടെ test. {endurl}ഇന്നുതന്നെ തുടങ്ങൂ — testoza.com-ൽ.',
  ],
};
// Headings and delivery notes come from the English script.
const en = readFileSync(ROOT + 'SCRIPT-en.md', 'utf8').split(/^## /m).slice(1).map((b) => ({
  head: b.split('\n')[0], delivery: b.match(/\*\*Delivery:\*\*\s*(.+)/)?.[1], cues: [...b.matchAll(/\{([a-z0-9]+)\}/g)].map((m) => m[1]).join(),
}));
for (const [lang, lines] of Object.entries(L)) {
  const md = [`# Script — TestoZa Short: Branding Tests (${lang.toUpperCase()} dub)`, '',
    `${NAME[lang]} audio track for the finished English Short (YouTube multi-language audio). Same \`## Lnn\` ids and`,
    '`{cue}` names as SCRIPT-en.md: capture/dub.mjs places each line so every cue word is spoken just after its',
    'on-screen action. App words stay English, as they appear on screen. Never say "free".', ''];
  lines.forEach((t, i) => {
    const cues = [...t.matchAll(/\{([a-z0-9]+)\}/g)].map((m) => m[1]).join();
    if (cues !== en[i].cues) throw new Error(`${lang} L0${i + 1}: cues ${cues} ≠ ${en[i].cues}`);
    md.push(`## ${en[i].head}`, ...(en[i].delivery ? [`**Delivery:** ${en[i].delivery}`] : []), '', `    ${t}`, '');
  });
  writeFileSync(ROOT + `SCRIPT-${lang}.md`, md.join('\n'));
  console.log(lang, lines.length, 'lines');
}
