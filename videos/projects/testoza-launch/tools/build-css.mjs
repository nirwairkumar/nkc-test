// Builds assets/app.css: the app's own Tailwind (frontend/tailwind.config.ts + src/index.css),
// compiled against the classes this video uses, plus the AI-import CSS, KaTeX and local fonts.
// Run from the project root: node tools/build-css.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const project = process.cwd();
const repo = path.resolve(project, '../../..'); // videos/projects/<project> → repo root
const fe = path.join(repo, 'frontend');
const rel = (p) => path.relative(repo, p).split(path.sep).join('/');

execFileSync(process.execPath, [
  path.join(fe, 'node_modules/tailwindcss/lib/cli.js'),
  '-c', path.join(fe, 'tailwind.config.ts'),
  '-i', path.join(fe, 'src/index.css'),
  '-o', path.join(project, 'assets/tw.css'),
  '--content', `./${rel(project)}/ui/**/*.html,./${rel(project)}/compositions/**/*.html`,
], { cwd: repo, stdio: 'inherit' });

const katexDir = path.join(fe, 'node_modules/katex/dist');
fs.mkdirSync(path.join(project, 'assets/katex'), { recursive: true });
for (const f of fs.readdirSync(path.join(katexDir, 'fonts'))) {
  if (f.endsWith('.woff2')) fs.copyFileSync(path.join(katexDir, 'fonts', f), path.join(project, 'assets/katex', f));
}
const katexCss = fs.readFileSync(path.join(katexDir, 'katex.min.css'), 'utf8')
  .replace(/url\(fonts\/([^)]+?\.woff2)\)/g, 'url(katex/$1)')
  .replace(/,url\(fonts\/[^)]+?\.(woff|ttf)\) format\("(woff|truetype)"\)/g, '');

const parts = [
  fs.readFileSync(path.join(project, 'assets/fonts.css'), 'utf8'),
  fs.readFileSync(path.join(project, 'assets/tw.css'), 'utf8'),
  fs.readFileSync(path.join(fe, 'src/components/ai-import/aiImport.css'), 'utf8'),
  katexCss,
];
// The film seeks frame by frame: drop every clock-driven declaration from the app's CSS
// (motion is re-authored on the GSAP timelines instead).
const still = parts.join('\n')
  .replace(/(-webkit-)?(transition|animation)(-[a-z-]+)?\s*:[^;}]*;?/g, '');
fs.writeFileSync(path.join(project, 'assets/app.css'), still);
fs.rmSync(path.join(project, 'assets/tw.css'));
console.log(`assets/app.css ${(fs.statSync(path.join(project, 'assets/app.css')).size / 1024).toFixed(0)} KB`);
