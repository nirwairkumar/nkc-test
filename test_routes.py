import asyncio
from app.main import app

def print_routes():
    res = []
    for route in app.routes:
        if "attempts" in route.path or "analytics" in route.path:
            res.append(f"{route.methods} {route.path}")
    print("\n".join(res))

if __name__ == "__main__":
    print_routes()
