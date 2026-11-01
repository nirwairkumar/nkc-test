/**
 * The page for a URL no page answers. The servers already sent HTTP 404 for it
 * (worker on testoza.com, functions/[[path]].js on app.testoza.com); this is what
 * the visitor reads.
 *
 * Most of these visitors were sent by an AI assistant that guessed an address
 * ("/inputs.php"), so the page says so, offers its best guess at what they wanted,
 * and puts the main pages one tap away. Each visit is logged as `page_not_found`
 * so the broken links people arrive on show up in Admin → Analytics.
 */
import { useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, FileUp, KeyRound, LifeBuoy, Trophy } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { analytics } from '@/lib/analytics/tracker';
import { correctedPath } from '@/utils/knownPaths';

const ASSISTANTS: [RegExp, string][] = [
  [/chatgpt|openai/, 'ChatGPT'],
  [/perplexity/, 'Perplexity'],
  [/gemini|bard/, 'Gemini'],
  [/copilot|bing/, 'Copilot'],
  [/claude|anthropic/, 'Claude'],
  [/deepseek/, 'DeepSeek'],
  [/grok/, 'Grok'],
  [/meta\.ai/, 'Meta AI'],
];

/** The assistant that sent this visitor (from ?utm_source= or the referrer), or null. */
function referringAssistant(search: string): string | null {
  const utm = new URLSearchParams(search).get('utm_source') || '';
  let referrer = '';
  try {
    referrer = document.referrer ? new URL(document.referrer).hostname : '';
  } catch { /* no usable referrer */ }
  const source = `${utm} ${referrer}`.toLowerCase();
  for (const [pattern, name] of ASSISTANTS) {
    if (pattern.test(source)) return name;
  }
  return null;
}

const MAIN_PAGES = [
  { to: '/generate-with-ai', icon: FileUp, title: 'Make a test with AI', body: 'Upload a PDF or photos of a paper' },
  { to: '/join', icon: KeyRound, title: 'Join an exam', body: 'Type the 6-digit code from your teacher' },
  { to: '/join/result', icon: Trophy, title: 'See your result', body: 'For an exam you have already taken' },
  { to: '/help', icon: LifeBuoy, title: 'Help', body: 'Ask a real person, or watch a tutorial' },
];

// "Did you mean": whole words in the missing address that point at one page.
const GUESSES: { words: RegExp; to: string; label: string }[] = [
  { words: /^(join|joining|code|exams?|attempt|candidates?|students?)$/, to: '/join', label: 'Join an exam with a code' },
  { words: /^(results?|scores?|marks|ranks?|scorecard)$/, to: '/join/result', label: 'See your result' },
  { words: /^(ai|pdf|upload|import|generate|generator|photos?|scan|ocr)$/, to: '/generate-with-ai', label: 'Make a test with AI' },
  { words: /^(create|make|maker|build|builder|quiz|quizzes|papers?|questions?|editor|new)$/, to: '/create-test', label: 'Create a test' },
  { words: /^(price|prices|pricing|plans?|premium|pro|buy|upgrade)$/, to: '/pricing', label: 'Pricing' },
  { words: /^(guides?|how|tutorials?|learn|blog|articles?|docs)$/, to: '/guides', label: 'Guides' },
  { words: /^(help|support|contact|faq)$/, to: '/help', label: 'Help' },
  { words: /^(login|signin|signup|register|account)$/, to: '/login', label: 'Sign in or sign up' },
  { words: /^(dashboard|batches|teachers?|institutes?)$/, to: '/dashboard', label: 'Your dashboard' },
];

function guessesFor(pathname: string) {
  const words = pathname.toLowerCase().replace(/\.[a-z0-9]+$/, '').split(/[^a-z0-9]+/).filter(Boolean);
  return GUESSES.filter(g => words.some(w => g.words.test(w))).slice(0, 2);
}

const NotFound = () => {
  const location = useLocation();
  const target = correctedPath(location.pathname);
  const assistant = referringAssistant(location.search);

  useEffect(() => {
    if (target) return;
    let from = assistant ?? 'direct';
    if (!assistant && document.referrer) {
      try { from = new URL(document.referrer).hostname; } catch { /* keep 'direct' */ }
    }
    analytics.track('page_not_found', { path: location.pathname.slice(0, 200), from });
  }, [location.pathname, target, assistant]);

  // A near miss (/pricing.php, /signup): the servers answer it with a 301; links inside the app land here.
  if (target) return <Navigate to={`${target}${location.search}${location.hash}`} replace />;

  const guesses = guessesFor(location.pathname);

  return (
    <div className="flex min-h-[70vh] items-start justify-center bg-slate-50 px-4 pb-16 pt-10 sm:pt-16">
      <SEO title="Page not found" description="This TestoZa page does not exist." noindex />
      <div className="w-full max-w-xl">
        <p className="text-[12px] font-medium uppercase leading-none tracking-widest text-slate-400">Page not found</p>
        <h1 className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[26px]">
          This page doesn't exist
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
          {assistant
            ? `${assistant} gave you a link to a page TestoZa doesn't have. AI assistants sometimes guess addresses. Here is where you can go instead.`
            : 'The address may be mistyped, or the link is out of date. Here is where you can go instead.'}
        </p>
        <p className="mt-3 break-all rounded-lg bg-white px-3 py-2 font-mono text-[12px] text-slate-500 ring-1 ring-slate-200">
          {location.pathname}
        </p>

        {guesses.length > 0 && (
          <div className="mt-5">
            <p className="text-[13px] font-medium text-slate-500">Did you mean</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {guesses.map(g => (
                <Link
                  key={g.to}
                  to={g.to}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-[14px] font-medium text-white hover:bg-indigo-700"
                >
                  {g.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {MAIN_PAGES.map(({ to, icon: Icon, title, body }) => (
            <Link
              key={to}
              to={to}
              className="flex items-start gap-3 rounded-xl bg-white p-3.5 ring-1 ring-slate-200 transition hover:ring-indigo-300"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
              <span>
                <span className="block text-[14px] font-semibold text-slate-900">{title}</span>
                <span className="block text-[13px] text-slate-500">{body}</span>
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-[13px] text-slate-500">
          Or go to the <Link to="/" className="font-medium text-indigo-600 hover:underline">homepage</Link> or
          browse <Link to="/guides" className="font-medium text-indigo-600 hover:underline">all guides</Link>.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
