import threading
from cachetools import TTLCache
from typing import Any

_cache_lock = threading.Lock()
# Cache individual test data for 5 minutes (300s)
test_cache: TTLCache = TTLCache(maxsize=500, ttl=300)
# Cache feed page 1 for 2 minutes
feed_cache: TTLCache = TTLCache(maxsize=50, ttl=120)

def cache_set(cache: TTLCache, key: str, value: Any):
    with _cache_lock:
        cache[key] = value

def cache_get(cache: TTLCache, key: str):
    with _cache_lock:
        return cache.get(key)

def cache_bust(cache: TTLCache, key: str):
    with _cache_lock:
        cache.pop(key, None)

def bust_test_cache(test_id: str):
    cache_bust(test_cache, f"test:{test_id}")
