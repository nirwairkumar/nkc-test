export async function onRequest(context) {
    const { request, env, params } = context;
    const url = new URL(request.url);

    // Extract slug or ID from params
    // Route: /test/[[slug]] matches /test/some-slug and /test/some-slug/
    const slugOrId = params.slug && params.slug[0];

    if (!slugOrId) {
        return env.ASSETS.fetch(request);
    }

    // 1. Fetch the static index.html
    // We want the base HTML structure to inject into
    const assetRequest = new Request(url, {
        headers: request.headers,
    });
    const response = await env.ASSETS.fetch(assetRequest);
    let html = await response.text();

    // 2. Fetch Test Data from Supabase
    // We use the REST API to avoid needing the JS client library here
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase env vars");
        return new Response(html, {
            headers: response.headers,
        });
    }

    try {
        // Try resolving as slug first
        let queryUrl = `${supabaseUrl}/rest/v1/tests?slug=eq.${slugOrId}&select=*`;
        let res = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        let data = await res.json();
        let test = data && data.length > 0 ? data[0] : null;

        // If not found by slug, try ID (UUID check)
        if (!test) {
            // Simple regex check for UUID validity to avoid DB error if using invalid text
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
            if (isUUID) {
                queryUrl = `${supabaseUrl}/rest/v1/tests?id=eq.${slugOrId}&select=*`;
                res = await fetch(queryUrl, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                data = await res.json();
                test = data && data.length > 0 ? data[0] : null;
            }
        }

        if (test) {
            // 3. Inject Meta Tags
            // We replace existing tags or inject new ones if placeholders exist.
            // Simplest strategy: Replace specific known static tags from index.html

            const title = test.title || "Answer Ace Lab";

            // Format description with categories if possible
            let description = test.description || "Attempt this online mock test on Answer Ace Lab.";
            const categories = [];
            if (test.tags && Array.isArray(test.tags)) categories.push(...test.tags);
            if (test.custom_category) categories.push(test.custom_category);

            if (categories.length > 0) {
                description += ` | Categories: ${categories.join(', ')}`;
            }
            description += " | Answer Ace Lab";

            const image = test.og_image || "https://testoza.pages.dev/default-og.png"; // Fallback
            const siteName = "Answer Ace Lab";
            const currentUrl = url.href;

            // Helper to replace content of a meta tag
            // Note: This regex is simple and assumes standard attribute ordering/quoting. 
            // For robustness, HTMLRewriter is better, but this string replacement is often sufficient for simple index.html files.
            /* 
               HTMLRewriter is native to Cloudflare Workers and safer. Let's use it.
            */

            return new HTMLRewriter()
                .on("title", {
                    element(element) {
                        element.setInnerContent(`${title} | ${siteName}`);
                    },
                })
                .on('meta[name="description"]', {
                    element(element) {
                        element.setAttribute("content", description);
                    },
                })
                .on('meta[property="og:title"]', {
                    element(element) {
                        element.setAttribute("content", title);
                    },
                })
                .on('meta[property="og:description"]', {
                    element(element) {
                        element.setAttribute("content", description);
                    },
                })
                .on('meta[property="og:image"]', {
                    element(element) {
                        element.setAttribute("content", image);
                    },
                })
                .on('meta[property="og:url"]', {
                    element(element) {
                        element.setAttribute("content", currentUrl);
                    },
                })
                .transform(response);
        }

    } catch (err) {
        console.error("Error applying SEO:", err);
    }

    // Fallback: return original HTML
    return new Response(html, {
        headers: response.headers,
    });
}
