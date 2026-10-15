// From the built index.html: English subtitles (.srt) and the YouTube description with chapters.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const html = readFileSync(ROOT + 'index.html', 'utf8');
const OUT = ROOT + 'youtube/';
mkdirSync(OUT, { recursive: true });

const ts = (s, ms = true) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), milli = Math.round((s % 1) * 1000);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return ms ? `${pad(h)}:${pad(m)}:${pad(sec)},${pad(milli, 3)}` : (h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`);
};
const caps = [...html.matchAll(/class="clip cap"[^>]*data-start="([\d.]+)" data-duration="([\d.]+)"[^>]*><span>([^<]*)<\/span>/g)]
  .map((m) => ({ s: +m[1], d: +m[2], t: m[3].replace(/&amp;/g, '&') }));
writeFileSync(OUT + 'subtitles-en.srt', caps.map((c, i) => `${i + 1}\n${ts(c.s)} --> ${ts(c.s + c.d)}\n${c.t}\n`).join('\n'));

const chips = [...html.matchAll(/class="clip chip"[^>]*data-start="([\d.]+)"[^>]*><b>[^<]*<\/b>([^<]*)</g)].map((m) => ({ s: +m[1], t: m[2] }));
const chapters = [{ s: 0, t: 'The finished paper' }, { s: 18, t: 'What we will build' }];
for (const c of chips) if (!chapters.some((x) => x.t === c.t)) chapters.push(c);
const end = +html.match(/data-composition-id="main"[^>]*data-duration="([\d.]+)"/)[1];
chapters.push({ s: end - 12, t: 'Make your first test' });
const chapterText = chapters.map((c) => `${ts(c.s, false)} ${c.t}`).join('\n');

writeFileSync(OUT + 'description.txt', `Online test kaise banaye? In this complete Hindi tutorial you build a full JEE-level question paper on TestoZa — step by step, on the real Create Test page.

What you learn:
• Questions in Hindi and English together (type in English letters, get Hindi)
• Diagrams straight from a question paper (Win + Shift + S, Ctrl + V)
• Chemistry structures inside the question, and structure pictures as options
• Full JEE maths with Sy Pad: integrals, fractions, roots, log, π
• Multistep reactions with reagents on the arrow, Match-the-list tables
• Sections: Physics, Chemistry, Mathematics — add, split, rename, merge
• Save and see exactly what candidates see

Chapters
${chapterText}

Make your first test free: https://testoza.com

Questions used: Allen JEE (Main) Sample Test Paper 04 (selected questions, for teaching).

#OnlineTest #TestMaker #JEEMain #HindiTutorial #TestoZa #MockTest #QuestionPaper
`);
writeFileSync(OUT + 'title-and-tags.txt', `Title (Hindi audio):
Online Test कैसे बनाएँ? Hindi + English, Diagram, Chemistry, JEE Maths | TestoZa Create Test पूरा Tutorial

Tags:
online test kaise banaye, online test maker, hindi question paper maker, jee mock test maker, create online test, test maker for teachers, coaching institute test software, sy pad, testoza, mock test platform, question paper in hindi, chemistry question paper maker, math test maker

Pinned comment:
Make your first test free 👉 https://testoza.com — which chapter should I make a video on next?
`);
console.log(caps.length, 'subtitles;', chapters.length, 'chapters');
console.log(chapterText);
