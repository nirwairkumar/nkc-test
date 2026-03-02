from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from app.core.database import get_db
from app.utils.rate_limiter import check_analytics_rate_limit
from supabase import Client
from .models import PageViewEvent
from user_agents import parse
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

async def process_analytics_event(event: PageViewEvent, client_ip: str, db: Client):
    try:
        # 1. Parse User Agent
        ua_string = event.user_agent or ""
        user_agent = parse(ua_string)
        
        device_type = "desktop"
        if user_agent.is_mobile:
            device_type = "mobile"
        elif user_agent.is_tablet:
            device_type = "tablet"
            
        browser = f"{user_agent.browser.family} {user_agent.browser.version_string}"
        os = f"{user_agent.os.family} {user_agent.os.version_string}"
        
        # 2. Extract Geo (Simplified: Assuming Cloudflare headers or fallback)
        # In a real deployed app, extract from CF-IPCountry
        country = "Unknown"  # Would be request.headers.get("cf-ipcountry", "Unknown")
        city = "Unknown"
        
        # 3. UPSERT Visitor
        visitor_resp = db.table("visitors").select("id").eq("fingerprint", event.fingerprint).execute()
        visitor_id = None
        
        if not visitor_resp.data:
            # Create new visitor
            new_visitor = db.table("visitors").insert({
                "fingerprint": event.fingerprint,
                "device_type": device_type,
                "browser": browser,
                "os": os,
                "country": country,
                "city": city,
            }).execute()
            visitor_id = new_visitor.data[0]["id"]
        else:
            visitor_id = visitor_resp.data[0]["id"]
            # Update last seen and increment total visits
            db.rpc("increment_visitor_count", {"v_id": visitor_id}).execute()
            
        # 4. UPSERT Session
        session_resp = db.table("sessions").select("id").eq("session_token", event.session_token).execute()
        session_id = None
        
        if not session_resp.data:
            new_session = db.table("sessions").insert({
                "visitor_id": visitor_id,
                "session_token": event.session_token,
                "entry_page": event.page_path,
                "referrer": event.referrer,
                "utm_source": event.utm_source,
                "utm_medium": event.utm_medium,
                "utm_campaign": event.utm_campaign
            }).execute()
            session_id = new_session.data[0]["id"]
        else:
            session_id = session_resp.data[0]["id"]
            # Update session end time on every hit
            db.table("sessions").update({
                "ended_at": "now()",
                "is_bounce": False # Second hit means not a bounce
            }).eq("id", session_id).execute()
            db.rpc("increment_session_pages", {"s_id": session_id}).execute()

        # 5. INSERT Page View
        db.table("page_views").insert({
            "session_id": session_id,
            "visitor_id": visitor_id,
            "page_path": event.page_path,
            "page_title": event.page_title,
            "referrer_page": event.referrer
        }).execute()
        
    except Exception as e:
        logger.error(f"Error processing analytics event: {str(e)}")

@router.post("/track", status_code=204, dependencies=[Depends(check_analytics_rate_limit)])
async def track_event(
    event: PageViewEvent, 
    request: Request, 
    background_tasks: BackgroundTasks,
    db: Client = Depends(get_db)
):
    """
    Fire-and-forget endpoint for tracking page views.
    Processes the event in the background to keep the response fast.
    """
    # Simple IP extraction suitable for proxy setups (like Railway/Cloudflare)
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()

    # Offload the DB writes to a background task
    background_tasks.add_task(process_analytics_event, event, client_ip, db)
    return
