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
    const apiUrl = env.VITE_API_URL || 'https://api.testoza.com/api';

    try {
        // Fetch test data from backend API
        // The backend /tests/{id} endpoint handles both UUIDs and slugs
        const apiPath = `${apiUrl}/tests/${slugOrId}`;

        const dbRes = await fetch(apiPath);

        if (!dbRes.ok) {
            const res = new Response(response.body, response);
            res.headers.set('X-SEO-Error', `API-Error-${dbRes.status}`);
            return res;
        }

        const test = await dbRes.json();

        if (test) {
            // Success! Prepare tags
            const title = test.title || "Answer Ace Lab";
            let description = test.description || "Attempt this online mock test.";
            if (description.length > 200) description = description.substring(0, 197) + "...";

            const parts = [];
            const cats = [];
            if (test.tags && Array.isArray(test.tags)) cats.push(...test.tags);
            if (test.custom_category) cats.push(test.custom_category);
            if (cats.length > 0) parts.push(`Categories: ${cats.join(', ')}`);
            if (test.creator_name) parts.push(`Creator: ${test.creator_name}`);
            parts.push("Answer Ace Lab");

            if (parts.length > 0) description += ` | ${parts.join(' | ')}`;

            const image = test.og_image || "https://testoza.pages.dev/default-og.png";
            const currentUrl = url.href;

            // Rewriter
            return new HTMLRewriter()
                .on("title", { element(e) { e.setInnerContent(title); } })
                .on('meta[name="description"]', { element(e) { e.setAttribute("content", description); } })
                .on('meta[property="og:title"]', { element(e) { e.setAttribute("content", title); } })
                .on('meta[property="og:description"]', { element(e) { e.setAttribute("content", description); } })
                .on('meta[property="og:image"]', { element(e) { e.setAttribute("content", image); } })
                .on('meta[property="og:url"]', { element(e) { e.setAttribute("content", currentUrl); } })
                // Inject debug marker
                .on('head', { element(e) { e.append(`<meta name="seo-worker-status" content="active-injected" />`, { html: true }); } })
                .transform(response);
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
