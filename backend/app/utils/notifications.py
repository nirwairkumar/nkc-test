from app.core.database import get_db, supabase as admin_client
from typing import Optional

def send_notification(
    user_id: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    custom_test_id: Optional[str] = None,
    sender_name: Optional[str] = None,
    sender_email: Optional[str] = None,
    db = None
):
    """
    Safely insert a notification into the notifications table for a user.
    Fails silently on errors so core operational flows are never blocked.
    """
    if not user_id:
        return None
    try:
        client = db if db is not None else admin_client
        payload = {
            "user_id": str(user_id),
            "title": title,
            "message": message,
            "link": link,
            "custom_test_id": str(custom_test_id) if custom_test_id else None,
            "sender_name": sender_name,
            "sender_email": sender_email,
            "read": False,
            "is_read": False
        }
        res = client.table("notifications").insert(payload).execute()
        return res.data
    except Exception as e:
        print(f"[Notification] Failed to send notification to user {user_id}: {e}")
        return None
