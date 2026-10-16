// Server-renders real TestoZa React components (and the ports in scenes/scenes.tsx) with
// sample data into static HTML fragments under ui/ssr/. The film's frames inline them.
// Run from the project root: node ui/render.mjs [name ...]
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { QUESTIONS, ADDED_QUESTION, FILE_NAME, TEST_TITLE } from './data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(here, '../../../../frontend'); // videos/projects/testoza-launch/ui → repo root
const outDir = path.join(here, 'ssr');
const nm = (p) => path.join(frontendDir, 'node_modules', p);
const req = createRequire(path.join(frontendDir, 'package.json'));
const { createServer } = await import(pathToFileURL(nm('vite/dist/node/index.js')).href);
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');

// Fixed clock so every "elapsed" label is deterministic.
const T0 = Date.UTC(2026, 9, 14, 4, 30, 0);
let NOW = T0;
Date.now = () => NOW;

const server = await createServer({
  root: frontendDir,
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false, fs: { allow: [frontendDir, here] } },
  appType: 'custom',
  resolve: {
    alias: [
      { find: /^@\//, replacement: path.join(frontendDir, 'src') + '/' },
      { find: /^dompurify$/, replacement: path.join(here, 'purify-stub.mjs') },
    ],
    // scenes.tsx lives outside the frontend; ui/node_modules is a junction to frontend/node_modules.
    dedupe: ['react', 'react-dom', 'lucide-react'],
  },
  ssr: { noExternal: ['dompurify'] },
  esbuild: { jsx: 'automatic' },
  optimizeDeps: { noDiscovery: true, include: [] },
});

const h = React.createElement;
fs.mkdirSync(outDir, { recursive: true });
const out = (name, el) => {
  const html = renderToStaticMarkup(el);
  fs.writeFileSync(path.join(outDir, `${name}.html`), html);
  console.log(`${name}.html  ${html.length} chars`);
};
const wanted = new Set(process.argv.slice(2));
const want = (n) => wanted.size === 0 || wanted.has(n);

try {
  const S = await server.ssrLoadModule(path.join(here, 'scenes/scenes.tsx'));

  // ── /generate-with-ai steps 1 and 2 ──────────────────────────────────────
  if (want('upload')) {
    out('upload-1', h(S.UploadStep1));
    out('upload-2', h(S.UploadStep2, { fileName: FILE_NAME }));
  }

  // ── Step 3: live extraction (real ProcessingView) ─────────────────────────
  if (want('processing')) {
    const { default: ProcessingView } = await server.ssrLoadModule(path.join(frontendDir, 'src/components/ai-import/ProcessingView.tsx'));
    const files = [{ name: FILE_NAME, size: 2_480_000, type: 'pdf' }];
    const stream = (n) => QUESTIONS.slice(0, n).map((q, i) => ({ key: `q${i}`, question: q, at: T0 + 20_000 + i * 1500 }));
    const base = { mode: 'extract', files, extractionMeta: null, onCancel() {}, startedAt: T0 };
    const done = (k) => Array.from({ length: k }, (_, i) => T0 + 30_000 + i * 17_000);
    // [found, batches done, stage, seconds elapsed, last reported percent]
    const states = [[0, 0, 'analyzing', 9, 14], [4, 0, 'extracting', 24, 41], [11, 1, 'extracting', 38, 55], [19, 2, 'extracting', 52, 68], [26, 2, 'extracting', 63, 79]];
    states.forEach(([found, bd, stage, sec, pct], i) => {
      NOW = T0 + sec * 1000;
      out(`processing-${i}`, h(ProcessingView, {
        ...base,
        progress: { stage, percent: pct, message: '', at: NOW - 300 },
        info: { totalPages: 6, textPages: 6, scannedPages: 0, totalBatches: 3, batchesDone: bd, batchDoneTimes: done(bd), batchesStartedAt: T0 + 12_000, stepDurations: [] },
        questions: stream(found),
        stageTimes: stage === 'analyzing'
          ? { upload: { start: T0, end: T0 + 4_000 }, read: { start: T0 + 4_000 } }
          : { upload: { start: T0, end: T0 + 4_000 }, read: { start: T0 + 4_000, end: T0 + 12_000 }, find: { start: T0 + 12_000 } },
        finalCount: null,
      }));
    });
    NOW = T0 + 74_000;
    out('processing-done', h(ProcessingView, {
      ...base,
      progress: { stage: 'complete', percent: 100, message: '', at: NOW },
      info: { totalPages: 6, textPages: 6, scannedPages: 0, totalBatches: 3, batchesDone: 3, batchDoneTimes: done(3), batchesStartedAt: T0 + 12_000, stepDurations: [] },
      questions: stream(30),
      stageTimes: { upload: { start: T0, end: T0 + 4_000 }, read: { start: T0 + 4_000, end: T0 + 12_000 }, find: { start: T0 + 12_000, end: T0 + 66_000 }, finish: { start: T0 + 66_000, end: T0 + 74_000 } },
      finalCount: 30,
    }));
  }

  // ── Step 4: review (real PreviewView) ─────────────────────────────────────
  // v3: a calmer stream (15 cards arrive one by one before the run completes)
  if (want('processing-slow')) {
    const { default: ProcessingView } = await server.ssrLoadModule(path.join(frontendDir, 'src/components/ai-import/ProcessingView.tsx'));
    const files = [{ name: FILE_NAME, size: 2_480_000, type: 'pdf' }];
    const stream = (n) => QUESTIONS.slice(0, n).map((q, i) => ({ key: `q${i}`, question: q, at: T0 + 20_000 + i * 1500 }));
    const done = (k) => Array.from({ length: k }, (_, i) => T0 + 30_000 + i * 17_000);
    [[0, 0, 'analyzing', 9, 14], [3, 0, 'extracting', 24, 41], [7, 1, 'extracting', 38, 55], [11, 2, 'extracting', 52, 68], [15, 2, 'extracting', 63, 79]].forEach(([found, bd, stage, sec, pct], i) => {
      NOW = T0 + sec * 1000;
      out(`processing-slow-${i}`, h(ProcessingView, {
        mode: 'extract', files, extractionMeta: null, onCancel() {}, startedAt: T0,
        progress: { stage, percent: pct, message: '', at: NOW - 300 },
        info: { totalPages: 6, textPages: 6, scannedPages: 0, totalBatches: 3, batchesDone: bd, batchDoneTimes: done(bd), batchesStartedAt: T0 + 12_000, stepDurations: [] },
        questions: stream(found),
        stageTimes: stage === 'analyzing'
          ? { upload: { start: T0, end: T0 + 4_000 }, read: { start: T0 + 4_000 } }
          : { upload: { start: T0, end: T0 + 4_000 }, read: { start: T0 + 4_000, end: T0 + 12_000 }, find: { start: T0 + 12_000 } },
        finalCount: null,
      }));
    });
  }

  if (want('preview')) {
    const { default: PreviewView } = await server.ssrLoadModule(path.join(frontendDir, 'src/components/ai-import/PreviewView.tsx'));
    out('preview', h(PreviewView, {
      data: {
        title: TEST_TITLE,
        description: 'Kinematics, current electricity, optics, modern physics and gravitation, in the JEE Main pattern.',
        questions: QUESTIONS, totalPages: 6, processedPages: 6, duration: 60,
        marking: { marks: 4, negativeMarks: 1, marks_source: 'paper', negative_source: 'paper', varies: false },
      },
      mode: 'extract', extractionMeta: null, durationSeconds: 74, saving: false,
      canGenerateMore: false, generatingMore: false,
      onTryAgain() {}, onEdit() {}, onSave() {}, onGenerateMore() {}, onGenerateInstead() {}, onDownloadJSON() {},
    }));
  }

  // ── Builder: last question, the added one, save bar ───────────────────────
  if (want('builder')) {
    const last = { ...QUESTIONS[29] };
    const empty = { id: 31, type: 'single', question: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: '', marks: 4, negativeMarks: 1 };
    out('builder-0', h(S.Builder, { questions: [{ q: QUESTIONS[28], n: 29 }, { q: last, n: 30 }], total: 30, marks: 120 }));
    out('builder-1', h(S.Builder, { questions: [{ q: QUESTIONS[28], n: 29 }, { q: last, n: 30 }, { q: empty, n: 31, id: 'b-new' }], total: 31, marks: 124 }));
    out('builder-2', h(S.Builder, { questions: [{ q: QUESTIONS[28], n: 29 }, { q: last, n: 30 }, { q: { ...ADDED_QUESTION, correctAnswer: '' }, n: 31, id: 'b-new' }], total: 31, marks: 124 }));
    out('builder-3', h(S.Builder, { questions: [{ q: QUESTIONS[28], n: 29 }, { q: last, n: 30 }, { q: ADDED_QUESTION, n: 31, id: 'b-new' }], total: 31, marks: 124 }));
  }

  // ── My tests, conduct, live exams, settings, results ──────────────────────
  if (want('dashboard')) {
    out('mytests', h(S.MyTests, { isNew: true }));
    out('conduct', h(S.ConductDialog));
    out('live-0', h(S.LiveExams, { submitted: 0, proctored: false }));
    out('live-1', h(S.LiveExams, { submitted: 0, proctored: true }));
    out('live-2', h(S.LiveExams, { submitted: 1, proctored: true }));
    out('settings', h(S.SettingsPanel));
    out('toast-saved', h(S.Toast, { title: 'Settings saved' }));
    out('toast-copied', h(S.Toast, { title: 'Exam link copied!' }));
    out('results', h(S.ResultsSheet, {
      rows: [{ name: 'Ananya Sharma', roll: '12B-07', score: 104, c: 27, w: 2, s: 2, time: '38m 12s', date: 'Oct 14, 10:42 AM' }],
    }));
  }

  // ── v3: join code ─────────────────────────────────────────────────────────
  if (want('v3')) {
    const code = S.JOIN_CODE;
    out('live-3', h(S.LiveExams, { submitted: 1, proctored: true, menuOpen: true }));
    out('live-4', h(S.LiveExams, { submitted: 1, proctored: true, joinCode: code }));
    out('live-5', h(S.LiveExams, { submitted: 2, proctored: true, joinCode: code }));
    out('toast-code', h(S.Toast, { title: 'Join code 482 913 is ready. Candidates enter it at testoza.com/join.' }));
    out('results-2', h(S.ResultsSheet, { rows: [
      { name: 'Ananya Sharma', roll: '12B-07', score: 104, c: 27, w: 2, s: 2, time: '38m 12s', date: 'Oct 14, 10:42 AM' },
      { name: 'Arjun Mehta', roll: '12B-19', score: 96, c: 25, w: 4, s: 2, time: '41m 05s', date: 'Oct 14, 10:47 AM' },
    ] }));
    const J = await server.ssrLoadModule(path.join(frontendDir, 'src/pages/guides/conduct/joinScreens.tsx'));
    for (let n = 0; n <= 6; n++) out('phone-join-' + n, h(J.JoinPageFrame, null, h(J.CodeStage, { code: code.slice(0, n), busy: false })));
  }

  // ── Candidate phone ───────────────────────────────────────────────────────
  if (want('phone')) {
    out('phone-gateway', h(S.PhoneGateway));
    out('phone-exam-0', h(S.PhoneExam, { index: 2, selected: null, time: '59:41' }));
    out('phone-exam-1', h(S.PhoneExam, { index: 2, selected: 'A', time: '59:38' }));
    out('phone-exam-sub', h(S.PhoneExam, { index: 31, selected: 'C', time: '21:47', submitting: true }));
    out('phone-done', h(S.PhoneSubmitted));
  }
} catch (e) {
  console.error(e.stack || e);
  process.exitCode = 1;
} finally {
  await server.close();
}
