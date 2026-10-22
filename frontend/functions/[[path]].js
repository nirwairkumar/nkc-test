/**
 * app.testoza.com: a URL no page answers gets a real 404 (or a 301 for a near miss)
 * instead of Pages' single-page fallback, which answers every path with a 200 copy
 * of index.html — so "/inputs.php", an AI assistant's guess, looked like a real page.
 *
 * Every other request passes straight through. The more specific functions
 * (test/, test-intro/, share/) take their own paths, static files never reach
 * this one (_routes.json, written by scripts/generatePagesRoutes.mjs), and the
 * other hosts on this build (testoza.com, blog.testoza.com) are left to the worker.
 */
import { isKnownPath } from '../src/utils/knownPaths.ts';
import { nearMissRedirect, notFoundPage } from './_shared/notFound.js';

const APP_HOST = 'app.testoza.com';

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    if (url.hostname !== APP_HOST || (request.method !== 'GET' && request.method !== 'HEAD') || isKnownPath(url.pathname)) {
        return env.ASSETS.fetch(request);
    }

    try {
        return nearMissRedirect(url) || await notFoundPage(request, (r) => env.ASSETS.fetch(r));
    } catch (err) {
        // Never let this page break a visit: fall back to the app as Pages serves it.
        console.error('Not-found handling failed:', err);
        return env.ASSETS.fetch(request);
    }
}
