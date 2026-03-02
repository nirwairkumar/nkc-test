export default {
    async fetch(request, env) {
        // Only log GET requests to HTML pages (avoid static assets)
        const url = new URL(request.url);

        // Fast paths - skip logging for api, static assets, etc
        if (
            url.pathname.startsWith('/api') ||
            url.pathname.startsWith('/assets') ||
            url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico)$/i)
        ) {
            return await fetch(request);
        }

        // Forward the request to origin (your React app)
        const response = await fetch(request);

        // Safely log to Cloudflare Analytics Engine (if configured)
        if (env.ANALYTICS) {
            try {
                env.ANALYTICS.writeDataPoint({
                    blobs: [
                        url.pathname,                              // Blob 1: page path
                        request.headers.get("cf-ipcountry") || "XX", // Blob 2: country
                        request.headers.get("user-agent") || "Unknown",   // Blob 3: user agent
                        request.headers.get("referer") || "Direct",      // Blob 4: referrer
                    ],
                    doubles: [1],                                  // Metric 1: hit count
                    indexes: [url.pathname.substring(0, 32)],      // Index for fast lookups (max 32 chars)
                });
            } catch (err) {
                console.error("Failed to log to CF Analytics Engine:", err);
            }
        }

        return response;
    }
};
