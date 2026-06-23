"""
Google Indexing API Utility
Automatically notifies Google when a new test is created or updated,
so it gets crawled and ranked faster.
"""
import json
import os
import threading
import httpx
from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleAuthRequest

SCOPES = ["https://www.googleapis.com/auth/indexing"]
INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"
SITE_URL = os.getenv("SITE_URL", "https://testoza.com")

# Path to service account key (in project root)
KEY_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "google-indexing-key.json")

_credentials = None

def _get_credentials():
    """Load and cache Google service account credentials."""
    global _credentials
    if _credentials and _credentials.valid:
        return _credentials

    if not os.path.exists(KEY_FILE):
        print(f"⚠️ [Indexing] Service account key not found at {KEY_FILE}. Skipping.")
        return None

    try:
        _credentials = service_account.Credentials.from_service_account_file(
            KEY_FILE, scopes=SCOPES
        )
        return _credentials
    except Exception as e:
        print(f"❌ [Indexing] Failed to load credentials: {e}")
        return None


def notify_google(url: str, action: str = "URL_UPDATED"):
    """
    Send a URL notification to Google Indexing API.
    Runs in a background thread so it doesn't block the API response.
    """
    def _send():
        try:
            creds = _get_credentials()
            if not creds:
                return

            # Refresh token if needed
            creds.refresh(GoogleAuthRequest())

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {creds.token}"
            }
            body = {
                "url": url,
                "type": action
            }

            response = httpx.post(INDEXING_ENDPOINT, json=body, headers=headers, timeout=10)

            if response.status_code == 200:
                print(f"✅ [Indexing] Google notified about: {url}")
            else:
                print(f"⚠️ [Indexing] Google returned {response.status_code}: {response.text}")

        except Exception as e:
            print(f"❌ [Indexing] Error notifying Google: {e}")

    # Run in a background thread so it doesn't slow down the API
    thread = threading.Thread(target=_send, daemon=True)
    thread.start()


def notify_test_created(test_data: dict):
    """Called when a new test is created. Builds the URL and notifies Google."""
    slug = test_data.get("slug")
    test_id = test_data.get("id")

    if slug:
        url = f"{SITE_URL}/test/{slug}"
    elif test_id:
        url = f"{SITE_URL}/test-intro/{test_id}"
    else:
        print("⚠️ [Indexing] No slug or ID found, skipping Google notification.")
        return

    print(f"🔔 [Indexing] New test created, notifying Google: {url}")
    notify_google(url)


def notify_test_updated(test_data: dict):
    """Called when a test is updated. Builds the URL and notifies Google."""
    slug = test_data.get("slug")
    test_id = test_data.get("id")

    if slug:
        url = f"{SITE_URL}/test/{slug}"
    elif test_id:
        url = f"{SITE_URL}/test-intro/{test_id}"
    else:
        return

    print(f"🔔 [Indexing] Test updated, notifying Google: {url}")
    notify_google(url)
