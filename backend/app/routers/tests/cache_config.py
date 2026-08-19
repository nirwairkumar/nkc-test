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
    with _cache_lock:
        keys_to_delete = []
        for key, value in list(test_cache.items()):
            if key == f"test:{test_id}" or key.startswith(f"test:{test_id}:"):
                keys_to_delete.append(key)
            elif isinstance(value, dict) and (value.get("id") == test_id or value.get("custom_id") == test_id or value.get("slug") == test_id):
                keys_to_delete.append(key)
                
        for key in set(keys_to_delete):
            test_cache.pop(key, None)

        feed_cache.clear()
