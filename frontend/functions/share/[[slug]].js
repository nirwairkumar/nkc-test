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

    // Defaults
    let test = null;
    let title = "TestoZa – Free Online Test Maker";
    let description = "Attempt this mock test on TestoZa with real exam experience, instant grading, and detailed solutions.";
    let image = "https://testoza.com/default-og.png";
    let destPath = "/";

    try {
        // Fetch test data from backend API
        const apiPath = `${apiUrl}/tests/${slugOrId}`;
        const res = await fetch(apiPath);

        if (res.ok) {
            test = await res.json();
        }

        if (test) {
            title = test.title ? `${test.title} | TestoZa` : title;
            let descText = test.description || "Attempt this online mock test.";
            if (descText.length > 200) descText = descText.substring(0, 197) + "...";

            const cats = [];
            if (test.tags && Array.isArray(test.tags)) cats.push(...test.tags);
            if (test.custom_category) cats.push(test.custom_category);

            const parts = [];
            if (cats.length > 0) parts.push(`Categories: ${cats.join(', ')}`);
            if (test.creator_name) parts.push(`Creator: ${test.creator_name}`);
            parts.push("TestoZa");

            if (parts.length > 0) {
                description = `${descText} | ${parts.join(' | ')}`;
            } else {
                description = descText;
            }

            if (test.og_image) image = test.og_image;

            destPath = test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`;
        }

    } catch (e) {
        console.error("Fetch error", e);
    }

    const canonicalUrl = `https://testoza.com${destPath}`;
    const redirectUrl = `https://testoza.com${destPath}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph -->
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="TestoZa" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <meta name="twitter:site" content="@testoza" />
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
            "Cache-Control": "public, max-age=60"
        }
    });
}
