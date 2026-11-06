/**
 * app.testoza.com: a URL no page answers gets a real 404 (or a 301 for a near miss)
 * instead of Pages' single-page fallback, which answers every path with a 200 copy
 * of index.html — so "/inputs.php", an AI assistant's guess, looked like a real page.
 *
 * It also keeps one address per page for search engines and AI assistants:
 *  - "//wordpress/" (doubled slashes) 301s to the single-slash path. Pages answered it
 *    with a copy of the app, and ChatGPT's index listed it as a TestoZa page;
 *  - testoza.com's own pages (guides, the user guide, About…) open here too, because they
 *    are routes of the same app. As separate URLs they were duplicates carrying the
 *    homepage's title (ChatGPT cited app.testoza.com/user-guide/ai-test-generation as
 *    "TestoZa – Free Online Test Maker"), so a direct visit 301s to testoza.com. In-app
 *    navigation never reaches the server and is unaffected;
 *  - every other page gets its own canonical and og:url instead of index.html's
 *    "https://testoza.com/", which told Google each app page was a copy of the homepage.
 *
 * The more specific functions (test/, test-intro/, share/, join/) take their own paths,
 * static files never reach this one (_routes.json, written by
 * scripts/generatePagesRoutes.mjs), and the other hosts on this build (testoza.com,
 * blog.testoza.com) are left to the worker.
 */
import { isKnownPath } from '../src/utils/knownPaths.ts';
import { isMarketingPath, MAIN_ORIGIN } from '../src/utils/marketingPaths.ts';
import { nearMissRedirect, notFoundPage } from './_shared/notFound.js';

const APP_HOST = 'app.testoza.com';

// testoza.com paths that stay usable on this host: the app's home, and pages people use
// while signed in here (the support form) or that have their own redirects (blog, PDF tools).
const STAY_ON_APP = ['/', '/support', '/blog', '/news', '/convert', '/pdf'];

const belongsOnMain = (pathname) =>
    isMarketingPath(pathname) &&
    !STAY_ON_APP.some((p) => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/')));

// Pages that described a feature TestoZa doesn't have (the AI reads PDFs and pictures, not videos).
const RETIRED = {
    '/youtube-to-quiz': `${MAIN_ORIGIN}/ai-test-generator`,
};

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    if (url.hostname !== APP_HOST || (request.method !== 'GET' && request.method !== 'HEAD')) {
        return env.ASSETS.fetch(request);
    }

    try {
        if (url.pathname.includes('//')) {
            return Response.redirect(`${url.origin}${url.pathname.replace(/\/{2,}/g, '/')}${url.search}`, 301);
        }

        const retired = RETIRED[url.pathname.replace(/\/+$/, '')];
        if (retired) {
            return Response.redirect(retired, 301);
        }

        if (belongsOnMain(url.pathname)) {
            return Response.redirect(`${MAIN_ORIGIN}${url.pathname}${url.search}`, 301);
        }

        if (!isKnownPath(url.pathname)) {
            return nearMissRedirect(url) || await notFoundPage(request, (r) => env.ASSETS.fetch(r));
        }
    } catch (err) {
        // Never let this page break a visit: fall back to the app as Pages serves it.
        console.error('Not-found handling failed:', err);
        return env.ASSETS.fetch(request);
    }

    const response = await env.ASSETS.fetch(request);
    if (url.pathname === '/' || !(response.headers.get('content-type') || '').includes('text/html')) {
        return response;
    }

    // index.html names https://testoza.com/ as every page's canonical; give this page its own.
    // (React's SEO component sets the same tag once the app loads.)
    const self = `https://${APP_HOST}${url.pathname}`;
    return new HTMLRewriter()
        .on('link[rel="canonical"]', { element(el) { el.setAttribute('href', self); } })
        .on('meta[property="og:url"]', { element(el) { el.setAttribute('content', self); } })
        .transform(response);
}
