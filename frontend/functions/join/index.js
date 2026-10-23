/**
 * app.testoza.com/join (testoza.com/join 301s here): the code screen's own preview card
 * instead of the homepage's. /join/<code> and /join/result are the worker's
 * (wrangler.toml routes app.testoza.com/join/*), which never sees the bare /join.
 */
import { joinPageMeta, rewriteHead } from '../_shared/testPreview.js';

export async function onRequest(context) {
    const { request, env } = context;
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('text/html')) return response;
    return rewriteHead(response, joinPageMeta(), 'https://testoza.com/join');
}
