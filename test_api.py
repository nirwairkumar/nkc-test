import requests

try:
    res = requests.get("http://127.0.0.1:8000/api/analytics/stats/attempts/logs")
    print("Status:", res.status_code)
    print("Data:", res.json()[:2]) # Print first two logs to keep it short
except Exception as e:
    print("Error:", e)
