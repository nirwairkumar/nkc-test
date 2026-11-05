// Builds the film's media from the generated takes and the real product recordings.
//   node tools/prep.mjs [footage|ui|all]
//
// assets/footage/*.mp4  Veo takes, whole length (the composition trims them with
//                        data-media-start, so they stay re-trimmable), light film grain, 24 fps.
// assets/ui/*.mp4        real TestoZa screens: cropped to the part the shot is about, re-timed.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const what = process.argv[2] || 'all';
const REC = '..'; // sibling video projects hold the product recordings
const ff = (...args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
const ENC = ['-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-g', '24', '-movflags', '+faststart'];
fs.mkdirSync('assets/footage', { recursive: true });
fs.mkdirSync('assets/ui', { recursive: true });

// Veo take -> footage name. Composites already carry the UI; they get the same grain.
const FOOTAGE = {
  'exam-hall': 'assets/shots/exam-hall.mp4',          // v2 take + the exact exam screen tracked on (Veo garbles text)
  'priya-nervous': 'gen/veo/priya-nervous-v3.mp4',      // lips closed 0-2.25 s
  'priya-nervous-close': 'gen/veo/priya-nervous-v2.mp4', // lips closed 3.75-6 s (the punch-in)
  'paper-class': 'gen/veo/paper-class-v1.mp4',
  'paper-class-watch': 'gen/veo/paper-class-v2.mp4',
  photocopier: 'gen/veo/photocopier-v1.mp4',
  'red-pen': 'gen/veo/red-pen-v1.mp4',
  'night-check': 'gen/veo/night-check-v1.mp4',
  'notice-board': 'gen/veo/notice-board-v1.mp4',
  copying: 'gen/veo/copying-v1.mp4',
  dawn: 'gen/veo/dawn-v1.mp4',
  'laptop-hands': 'gen/veo/laptop-hands-v1.mp4',
  'board-code': 'gen/veo/board-code-v1.mp4',
  'class-phones': 'gen/veo/class-phones-v1.mp4',
  'priya-phone': 'gen/veo/priya-phone-v1.mp4',
  'lab-wide': 'gen/veo/lab-wide-v1.mp4',
  'lab-screen': 'assets/shots/lab-screen.mp4',
  'class-result': 'gen/veo/class-result-v1.mp4',
  'teacher-ots': 'assets/shots/teacher-ots.mp4',
  'pen-down': 'gen/veo/pen-down-v1.mp4',
  dinner: 'gen/veo/dinner-v1.mp4',
  'exam-calm': 'assets/shots/exam-calm.mp4',
  'priya-calm': 'gen/veo/priya-calm-v1.mp4',
};

// node tools/prep.mjs footage exam-hall dawn   rebuilds just those
const only = process.argv.slice(3);
if (what === 'footage' || what === 'all') {
  for (const [name, src] of Object.entries(FOOTAGE)) {
    if (only.length && !only.includes(name)) continue;
    ff('-i', src, '-vf', 'fps=24,noise=alls=3:allf=t,format=yuv420p', ...ENC, `assets/footage/${name}.mp4`);
    console.log(`assets/footage/${name}.mp4`);
  }
}

if (what === 'ui' || what === 'all') {
  const toFrame = 'scale=1920:1080:flags=lanczos,fps=24,format=yuv420p';
  // AI import: questions arrive live (x2.275), then "Your questions are ready - 100%" held.
  ff('-i', `${REC}/testoza-top-10-features/assets/cut/2-ai-fd8d0c4f75.mp4`, '-filter_complex',
    '[0]trim=9.8:18.9,setpts=(PTS-STARTPTS)/2.275[a];' +
    '[0]trim=18.9:19.45,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.8[b];' +
    `[a][b]concat=n=2:v=1:a=0,crop=1820:1024:300:104,${toFrame}[v]`, '-map', '[v]', ...ENC, 'assets/ui/ai-import.mp4');
  // Results panel the moment a mock ends: 52 started, 48 submitted, every score.
  // (the drawer slides open at 13 s in this take and is settled from 14 s)
  ff('-ss', '14.2', '-i', `${REC}/testoza-results-analysis/assets/cut/2-panel-fd736f4ec6.mp4`, '-t', '4.4',
    '-vf', `crop=1342:755:962:0,${toFrame}`, ...ENC, 'assets/ui/results-panel.mp4');
  // Rank switched on: #1 Aditi Sharma 37.5/40 and down.
  ff('-ss', '84', '-i', `${REC}/testoza-results-analysis/assets/cut/2-panel-fd736f4ec6.mp4`, '-t', '2.2',
    '-vf', `crop=1342:755:962:440,${toFrame}`, ...ENC, 'assets/ui/rank-list.mp4');
  // Results report: how the class did, teach these again, by section.
  ff('-ss', '19.5', '-i', `${REC}/testoza-results-analysis/assets/cut/5-report-13a028dffd.mp4`, '-t', '2.4',
    '-vf', `crop=1760:990:430:70,${toFrame}`, ...ENC, 'assets/ui/results-report.mp4');
  // Phone: exam in progress, then "Warning 1/3: Tab Switching / Navigation is not allowed!"
  // (bottom 13 px of the recording carry a capture artefact)
  ff('-ss', '13.6', '-i', `${REC}/testoza-top-10-features/assets/cut/16-phone-ce0a2e88b6.mp4`, '-t', '4.4',
    '-vf', 'crop=646:1385:0:0,fps=24,format=yuv420p', ...ENC, 'assets/ui/phone-warning.mp4');
  console.log('assets/ui: ai-import, results-panel, rank-list, results-report, phone-warning');
}
