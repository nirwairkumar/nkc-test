import { previewMeta, rewriteHead } from '../_shared/testPreview.js';

export async function onRequest(context) {
    const { request, env, params } = context;
    const url = new URL(request.url);

    const slugOrId = params.slug && params.slug[0];

    if (!slugOrId) {
        return env.ASSETS.fetch(request);
    }

    const assetRequest = new Request(url, { headers: request.headers });
    const response = await env.ASSETS.fetch(assetRequest);

    // Backend API Config
    const apiUrl = env.VITE_API_URL || 'https://apigcp.testoza.com/api';

    try {
        // Fetch test data from backend API (no questions: the preview only needs the facts)
        const dbRes = await fetch(`${apiUrl}/tests/${slugOrId}?exclude_questions=true`);

        if (!dbRes.ok) {
            const res = new Response(response.body, response);
            res.headers.set('X-SEO-Error', `API-Error-${dbRes.status}`);
            return res;
        }

        const test = await dbRes.json();

        if (test) {
            // Test pages live on app.testoza.com; testoza.com/test-intro/… 301s here.
            const canonicalUrl = test.slug ? `https://app.testoza.com/test/${test.slug}` : `https://app.testoza.com/test-intro/${slugOrId}`;
            return rewriteHead(response, previewMeta(test), canonicalUrl);
        } else {
            const res = new Response(response.body, response);
            res.headers.set('X-SEO-Status', 'Test-Not-Found');
            return res;
        }

    } catch (err) {
        const res = new Response(response.body, response);
        res.headers.set('X-SEO-Error', `Exception-${err.message}`);
        return res;
    }
}
