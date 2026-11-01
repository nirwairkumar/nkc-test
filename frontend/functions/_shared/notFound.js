/**
 * The HTTP answer for a URL no TestoZa page answers (src/utils/knownPaths.ts),
 * shared by the Cloudflare worker (testoza.com) and functions/[[path]].js
 * (app.testoza.com), so both hosts say the same thing.
 *
 *  - A near miss (/pricing.php, /signup) → 301 to the real page.
 *  - Anything else → 404 with the app's index.html: the browser still boots the app
 *    and shows NotFound (pages/NotFound.tsx); crawlers and AI assistants that don't
 *    run JavaScript read "page not found", a noindex and links to the main pages,
 *    instead of a 200 that looks like the homepage.
 */
import { correctedPath } from '../../src/utils/knownPaths.ts';
import { publicUrl } from '../../src/utils/marketingPaths.ts';

const STRIP = [
  'title', 'meta[name="description"]', 'meta[name="keywords"]', 'meta[name="author"]',
  'meta[name="robots"]', 'meta[name="googlebot"]', 'link[rel="canonical"]',
  'meta[property^="og:"]', 'meta[name^="twitter:"]', 'script[type="application/ld+json"]'
];

const HEAD = `
    <title>Page not found | TestoZa</title>
    <meta name="description" content="This TestoZa page does not exist.">
    <meta name="robots" content="noindex">
`;

const BODY = `
        <h1>This page doesn't exist</h1>
        <p>TestoZa has no page at this address. AI assistants sometimes guess addresses; these are the real ones:</p>
        <ul>
          <li><a href="https://app.testoza.com/generate-with-ai">Make a test with AI</a></li>
          <li><a href="https://app.testoza.com/join">Join an exam with a code</a></li>
          <li><a href="https://app.testoza.com/join/result">See your result</a></li>
          <li><a href="https://app.testoza.com/help">Help</a></li>
          <li><a href="https://testoza.com/guides">All guides</a></li>
          <li><a href="https://testoza.com/">Homepage</a></li>
        </ul>
        <p>Every page is listed at <a href="https://testoza.com/llms.txt">testoza.com/llms.txt</a>.</p>
`;

/** A 301 for a near miss, or null. */
export function nearMissRedirect(url) {
  const target = correctedPath(url.pathname);
  if (!target) return null;
  return new Response(null, {
    status: 301,
    headers: { Location: `${publicUrl(target)}${url.search}`, 'Cache-Control': 'public, max-age=3600' }
  });
}

/**
 * The 404 page, from `fetchOrigin(request)` (the app's index.html, which Pages serves
 * for any path). A real file that happens to sit at the path is returned untouched.
 */
export async function notFoundPage(request, fetchOrigin) {
  const asGet = request.method === 'HEAD' ? new Request(request, { method: 'GET' }) : request;
  const origin = await fetchOrigin(asGet);
  if (!origin.ok || !(origin.headers.get('content-type') || '').includes('text/html')) return origin;
  const html = await origin.text();
  if (!html.includes('id="root"')) return new Response(html, origin);

  const headers = new Headers(origin.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  headers.delete('Content-Length');
  headers.delete('ETag');

  const rewriter = new HTMLRewriter();
  for (const selector of STRIP) {
    rewriter.on(selector, { element(el) { el.remove(); } });
  }
  rewriter
    .on('head', { element(el) { el.append(HEAD, { html: true }); } })
    .on('main', { element(el) { el.setInnerContent(BODY, { html: true }); } });

  const body = rewriter.transform(new Response(html, { headers })).body;
  return new Response(request.method === 'HEAD' ? null : body, { status: 404, headers });
}
