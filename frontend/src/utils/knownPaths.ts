/**
 * Which URLs are real TestoZa pages, and where a near miss should go.
 *
 * AI assistants invent links ("/inputs.php", "/pricing.html"). Every answer for such
 * a URL comes from here, so the browser and the servers agree:
 *  - the Cloudflare worker (testoza.com) and the Pages Function functions/[[path]].js
 *    (app.testoza.com) answer an unknown path with HTTP 404, a near miss with a 301;
 *  - the app's NotFound page offers the same correction and the main pages.
 *
 * Plain, dependency-free TypeScript like marketingPaths.ts: no '@/' imports, no
 * browser globals.
 */
import { isMarketingPath } from './marketingPaths';

/**
 * The first path segment of every route in src/App.tsx and every Pages Function in
 * functions/. scripts/generatePagesRoutes.mjs fails the build when App.tsx gains a
 * route whose first segment is missing here.
 */
export const APP_SECTIONS: readonly string[] = [
  'about', 'ai-question-generator', 'all-submissions', 'analysis', 'analytics', 'assessment-platform',
  'auth', 'auth-error', 'auto-grading-software', 'batches', 'blog', 'combined-break', 'combined-intro',
  'compare', 'convert', 'create-combined-test', 'create-mock-test-online', 'create-test', 'creator',
  'dashboard', 'edit-test', 'exam-software-for-schools', 'exams', 'explore', 'feedback', 'generate-with-ai', 'guides',
  'help', 'history', 'invite', 'j', 'join', 'live', 'login', 'mcq-test-maker', 'more-tests', 'my-posts',
  'my-tests', 'news', 'notifications', 'onboarding', 'online-exam-software', 'online-proctoring-software',
  'online-quiz-maker', 'online-test-for-coaching', 'online-test-maker', 'pdf', 'pdf-to-quiz', 'posts',
  'premium', 'pricing', 'privacy-policy', 'profile', 'quiz-creator', 'results', 'rewards', 'settings',
  'share', 'share-exam', 'share-invite', 'solutions', 'solutions-editor', 'support', 'survey', 'terms-and-conditions', 'test',
  'test-analysis', 'test-intro', 'test-submitted', 'tests', 'update-password', 'user-guide',
  'white-label-test-platform', 'youtube-to-quiz'
];

const SECTION_SET = new Set(APP_SECTIONS);

/** True when some page answers this path (React Router matches case-insensitively). */
export const isKnownPath = (pathname: string): boolean => {
  if (pathname === '/' || pathname === '') return true;
  if (isMarketingPath(pathname)) return true;
  const first = pathname.split('/')[1].toLowerCase();
  return SECTION_SET.has(first);
};

// Words people and AI assistants try for pages that exist under another name.
const ALIASES: Record<string, string> = {
  '/home': '/',
  '/index': '/',
  '/signup': '/login',
  '/sign-up': '/login',
  '/signin': '/login',
  '/sign-in': '/login',
  '/register': '/login',
  '/join-exam': '/join',
  '/exam-code': '/join',
  '/result': '/join/result',
  '/contact': '/support',
  '/contact-us': '/support',
  '/faq': '/help',
  '/plans': '/pricing',
  // Study Materials was removed on 2026-10-25; old bookmarks land on the dashboard.
  '/materials': '/dashboard',
};

// File endings TestoZa never had: /pricing.php, /about.html, /join/index.aspx …
const FILE_SUFFIX = /(\/index)?\.(php\d?|html?|aspx?|jsp|cgi|cfm)$/i;

/**
 * Where a path that matches no page should go instead, or null when there is no
 * sure answer (then it is a real 404). Only for unknown paths: a known path is
 * never rewritten.
 */
export const correctedPath = (pathname: string): string | null => {
  if (isKnownPath(pathname)) return null;
  const stripped = pathname.replace(FILE_SUFFIX, '').replace(/\/+$/, '') || '/';
  const target = ALIASES[stripped.toLowerCase()] ?? stripped;
  return target !== pathname && isKnownPath(target) ? target : null;
};
