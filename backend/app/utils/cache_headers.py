from fastapi import Response

def set_public_cache(response: Response, browser_max_age: int = 300, edge_max_age: int = 3600):
    """
    Sets Cache-Control header for public data.
    browser_max_age: how long the browser caches it (seconds). Default 5 mins.
    edge_max_age: how long Cloudflare (s-maxage) caches it at the edge (seconds). Default 1 hour.
    """
    response.headers["Cache-Control"] = f"public, max-age={browser_max_age}, s-maxage={edge_max_age}"

def set_private_cache(response: Response, max_age: int = 60):
    """
    Sets Cache-Control header for private user data, preventing CDN edge caching.
    max_age: how long the browser caches it (seconds). Default 1 min.
    """
    response.headers["Cache-Control"] = f"private, max-age={max_age}"

def set_no_cache(response: Response):
    """
    Prevents any caching. Useful for highly sensitive or real-time data.
    """
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
