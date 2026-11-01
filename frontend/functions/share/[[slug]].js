/**
 * /share/<test id or slug> → the test's own page, as an HTTP redirect.
 *
 * This used to be an HTML page of preview tags that sent people on with
 * window.location.replace(). That was a JavaScript redirect page (Google Ads reads
 * crawler-only pages plus a script hop as cloaking) and it put test titles into the
 * HTML unescaped, so a title could inject a script. Link previews still work: social
 * crawlers follow the redirect, and functions/test sets the preview tags there.
 */
export async function onRequest(context) {
    const { request, env, params } = context;
    const url = new URL(request.url);

    // slugOrId from /share/[[slug]]
    const slugOrId = params.slug && params.slug[0];

    if (!slugOrId) {
        return new Response("Not Found", { status: 404 });
    }

    // Backend API Config
    const apiUrl = env.VITE_API_URL || 'https://apigcp.testoza.com/api';

    let destPath = "/";

    try {
        const res = await fetch(`${apiUrl}/tests/${encodeURIComponent(slugOrId)}`);
        if (res.ok) {
            const test = await res.json();
            if (test) {
                destPath = test.slug
                    ? `/test/${encodeURIComponent(test.slug)}`
                    : `/test-intro/${encodeURIComponent(test.id)}`;
            }
        }
    } catch (e) {
        console.error("Fetch error", e);
    }

    // Same host the request came in on (app.testoza.com in production).
    return new Response(null, {
        status: 302,
        headers: {
            "Location": new URL(destPath, url.origin).toString(),
            "Cache-Control": "public, max-age=60"
        }
    });
}
