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
        // Fetch test data from backend API
        const apiPath = `${apiUrl}/tests/${slugOrId}`;
        const dbRes = await fetch(apiPath);

        if (!dbRes.ok) {
            const res = new Response(response.body, response);
            res.headers.set('X-SEO-Error', `API-Error-${dbRes.status}`);
            return res;
        }

        const test = await dbRes.json();

        if (test) {
            const testTitle = test.title ? `${test.title} | TestoZa` : "TestoZa – Free Online Test Maker";
            let description = test.description || "Attempt this online mock test with real exam experience, instant grading, and detailed solutions on TestoZa.";
            if (description.length > 200) description = description.substring(0, 197) + "...";

            const parts = [];
            const cats = [];
            if (test.tags && Array.isArray(test.tags)) cats.push(...test.tags);
            if (test.custom_category) cats.push(test.custom_category);
            if (cats.length > 0) parts.push(`Categories: ${cats.join(', ')}`);
            if (test.creator_name) parts.push(`Creator: ${test.creator_name}`);
            parts.push("TestoZa");

            if (parts.length > 0) description += ` | ${parts.join(' | ')}`;

            const image = test.og_image || "https://testoza.com/default-og.png";
            const canonicalUrl = `https://testoza.com/test/${test.slug || slugOrId}`;

            // Rewriter
            return new HTMLRewriter()
                .on("title", { element(e) { e.setInnerContent(testTitle); } })
                .on('meta[name="description"]', { element(e) { e.setAttribute("content", description); } })
                .on('link[rel="canonical"]', { element(e) { e.setAttribute("href", canonicalUrl); } })
                .on('meta[property="og:title"]', { element(e) { e.setAttribute("content", testTitle); } })
                .on('meta[property="og:description"]', { element(e) { e.setAttribute("content", description); } })
                .on('meta[property="og:image"]', { element(e) { e.setAttribute("content", image); } })
                .on('meta[property="og:url"]', { element(e) { e.setAttribute("content", canonicalUrl); } })
                .on('meta[name="twitter:title"]', { element(e) { e.setAttribute("content", testTitle); } })
                .on('meta[name="twitter:description"]', { element(e) { e.setAttribute("content", description); } })
                .on('meta[name="twitter:image"]', { element(e) { e.setAttribute("content", image); } })
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
