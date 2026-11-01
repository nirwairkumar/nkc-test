/**
 * Which URLs testoza.com serves itself and which live on app.testoza.com.
 *
 * Plain, dependency-free TypeScript: the browser (utils/subdomain.ts, SEO.tsx)
 * and the Cloudflare worker (infrastructure/cloudflare-worker/worker.js) both
 * import it, so the server's 301s, the in-app redirect, canonical URLs and the
 * sitemap always agree. Keep it free of '@/' imports and browser globals.
 *
 * Google Ads: every visitor and every crawler must get the same answer for a
 * URL. A 200 page for crawlers that the browser then leaves with a JavaScript
 * redirect reads as cloaking ("Circumventing systems").
 */
import { GUIDE_METAS } from '../guides/meta';

export const MAIN_ORIGIN = 'https://testoza.com';
export const APP_ORIGIN = 'https://app.testoza.com';

// Paths testoza.com serves itself (an entry or any of its sub-paths); every other
// path lives on app.testoza.com. Matching on "p/" keeps '/pdf' from also admitting '/pdf-to-quiz'.
export const MARKETING_PATHS = [
  '/',
  '/about',
  '/blog',
  '/news',
  '/privacy-policy',
  '/terms-and-conditions',
  '/support',
  '/user-guide',
  '/convert',
  '/pdf',
  '/quiz-creator',
  '/assessment-platform',
  '/create-mock-test-online',
  // The guides index (pages/GuidesIndex.tsx), which lists every guide below.
  '/guides',
  // Long-form guides (src/guides/meta.ts), so a new guide can't be left out.
  ...GUIDE_METAS.map(g => g.path)
];

export const isMarketingPath = (pathname: string): boolean =>
  MARKETING_PATHS.some(p => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/')));

/** An OAuth sign-in response (?code=… or ?error=…), which always finishes on the app subdomain. */
export const isAuthReturn = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.has('code') || params.has('error');
};

/**
 * The public URL of a page: testoza.com for marketing paths, app.testoza.com for
 * everything else. Used for canonical tags, og:url and sitemap entries.
 */
export const publicUrl = (pathAndQuery: string): string => {
  const path = pathAndQuery.startsWith('/') ? pathAndQuery : '/' + pathAndQuery;
  const pathname = path.split(/[?#]/)[0];
  return `${isMarketingPath(pathname) ? MAIN_ORIGIN : APP_ORIGIN}${path}`;
};
