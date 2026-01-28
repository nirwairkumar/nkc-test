export async function onRequest(context) {
    const { request, env, params } = context;
    const url = new URL(request.url);

    // slugOrId from /share/[[slug]]
    const slugOrId = params.slug && params.slug[0];

    if (!slugOrId) {
        return new Response("Not Found", { status: 404 });
    }

    // Supabase Config
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return new Response("Configuration Error", { status: 500 });
    }

    // Defaults
    let test = null;
    let title = "Answer Ace Lab";
    let description = "Attempt this mock test on Answer Ace Lab with real exam experience.";
    let image = "https://testoza.pages.dev/default-og.png";
    let destPath = "/";

    try {
        // 1. Try fetching by slug
        let queryUrl = `${supabaseUrl}/rest/v1/tests?slug=eq.${slugOrId}&select=*`;
        let res = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        let data = await res.json();
        if (data && data.length > 0) {
            test = data[0];
        }

        // 2. If not found, try by ID (if valid UUID)
        if (!test) {
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
                if (data && data.length > 0) {
                    test = data[0];
                }
            }
        }

        if (test) {
            title = test.title || title;
            // Format Description
            let descText = test.description || "Attempt this online mock test.";
            if (descText.length > 200) descText = descText.substring(0, 197) + "...";

            const cats = [];
            if (test.tags && Array.isArray(test.tags)) cats.push(...test.tags);
            if (test.custom_category) cats.push(test.custom_category);

            // Build parts
            const parts = [];
            if (cats.length > 0) parts.push(`Categories: ${cats.join(', ')}`);
            if (test.creator_name) parts.push(`Creator: ${test.creator_name}`);
            parts.push("Answer Ace Lab");

            if (parts.length > 0) {
                description = `${descText} | ${parts.join(' | ')}`;
            } else {
                description = descText;
            }

            // Image
            if (test.og_image) image = test.og_image;

            // Destination
            destPath = test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`;
        }

    } catch (e) {
        console.error("Fetch error", e);
    }

    // Construct Canonical URL (the share URL itself is often best for OG, or the destination)
    // User requested "Clean canonical URL". Usually this means the public SPA URL.
    const canonicalUrl = `${url.origin}${destPath}`;
    const redirectUrl = `${url.origin}${destPath}`;

    // HTML Template
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} | Answer Ace Lab</title>

  <meta name="description" content="${description}" />

  <!-- Open Graph -->
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:type" content="website" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
</head>
<body>
  <p>Redirecting to test...</p>
  <script>
    window.location.replace("${redirectUrl}");
  </script>
</body>
</html>`;

    return new Response(html, {
        headers: {
            "Content-Type": "text/html;charset=UTF-8",
            // Cache for a short time to improve performance but allow updates
            "Cache-Control": "public, max-age=60"
        }
    });
}
