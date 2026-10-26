/**
 * app.testoza.com/invite/<CODE>: an educator's invite link. The page is the app's
 * (pages/InvitePage); this only gives the link its own preview card, so WhatsApp shows
 * "Asha Verma invited you to TestoZa" instead of the homepage's card.
 */
import { invitePageMeta, rewriteHead } from '../_shared/testPreview.js';

const CODE_RE = /^[A-Z0-9]{6,12}$/;

export async function onRequest(context) {
    const { request, env, params } = context;
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('text/html')) return response;

    const code = String((params.code && params.code[0]) || '').replace(/[\s-]/g, '').toUpperCase();
    let name = '';
    if (CODE_RE.test(code)) {
        try {
            const apiUrl = env.VITE_API_URL || 'https://apigcp.testoza.com/api';
            // Cached at the edge: a link pasted in a busy group is fetched by every phone's preview.
            const res = await fetch(`${apiUrl}/referrals/code/${code}`, { cf: { cacheTtl: 600, cacheEverything: true } });
            if (res.ok) name = String((await res.json()).name || '').slice(0, 80);
        } catch (err) {
            console.error('Invite preview lookup failed:', err);
        }
    }
    // HTMLRewriter sets attributes and text safely: a name can't inject markup.
    return rewriteHead(response, invitePageMeta(name), `https://app.testoza.com/invite/${code}`);
}
