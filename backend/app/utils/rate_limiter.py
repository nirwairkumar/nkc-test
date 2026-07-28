from fastapi import Request, HTTPException, status
from typing import Dict, List
import time
from collections import defaultdict

# Simple In-Memory Rate Limiter (For Production, use Redis)
class RateLimiter:
    def __init__(self, requests: int, window: int):
        self.requests = requests
        self.window = window
        self.clients: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup = time.time()
        self._cleanup_interval = 300  # Global cleanup every 5 minutes

    def _global_cleanup(self):
        """Remove all stale client entries to prevent unbounded dict growth."""
        current_time = time.time()
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
        self._last_cleanup = current_time
        stale_keys = [
            k for k, v in self.clients.items()
            if not v or (current_time - max(v)) >= self.window
        ]
        for k in stale_keys:
            del self.clients[k]

    def is_allowed(self, client_id: str) -> bool:
        current_time = time.time()
        
        # Periodic global cleanup
        self._global_cleanup()
        
        # Clean up old timestamps for this client
        self.clients[client_id] = [t for t in self.clients[client_id] if current_time - t < self.window]
        
        if len(self.clients[client_id]) >= self.requests:
            return False
            
        self.clients[client_id].append(current_time)
        return True

# 100 requests per minute per IP for analytics track endpoint
analytics_rate_limiter = RateLimiter(requests=100, window=60)

async def check_analytics_rate_limit(request: Request):
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
        
    if not analytics_rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many analytics requests"
        )

