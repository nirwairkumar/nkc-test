from fastapi import Request, HTTPException, status
from typing import Dict, Tuple
import time
from collections import defaultdict

# Simple In-Memory Rate Limiter (For Production, use Redis)
class RateLimiter:
    def __init__(self, requests: int, window: int):
        self.requests = requests
        self.window = window
        self.clients: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, client_id: str) -> bool:
        current_time = time.time()
        
        # Clean up old timestamps
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
