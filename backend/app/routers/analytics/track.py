from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from app.core.database import get_db
from app.utils.rate_limiter import check_analytics_rate_limit
from supabase import Client
from .models import PageViewEvent
from user_agents import parse
import httpx
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Single shared httpx client — reused across all requests, prevents TCP connection leaks
_geo_client = httpx.AsyncClient(
    timeout=3.0,
    limits=httpx.Limits(max_connections=5, max_keepalive_connections=2),
)


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
        
        # 2. Extract Geo via free IP geolocation API (ip-api.com, no key needed)
        country = "Unknown"
        city = "Unknown"
        try:
            geo_resp = await _geo_client.get(f"http://ip-api.com/json/{client_ip}?fields=country,city,status")
            if geo_resp.status_code == 200:
                geo_data = geo_resp.json()
                if geo_data.get("status") == "success":
                    country = geo_data.get("country", "Unknown")
                    city = geo_data.get("city", "Unknown")
        except Exception as geo_err:
            logger.warning(f"Geo lookup failed for {client_ip}: {geo_err}")
        
        # 3. UPSERT Visitor
        visitor_resp = db.table("visitors").select("id").eq("fingerprint", event.fingerprint).execute()
        visitor_id = None
        is_new_visitor = False
        
        if not visitor_resp.data:
            is_new_visitor = True
            # Create new visitor
            insert_data = {
                "fingerprint": event.fingerprint,
                "device_type": device_type,
                "browser": browser,
                "os": os,
                "country": country,
                "city": city,
            }
            if event.user_id:
                insert_data["user_id"] = event.user_id
            new_visitor = db.table("visitors").insert(insert_data).execute()
            visitor_id = new_visitor.data[0]["id"]
        else:
            visitor_id = visitor_resp.data[0]["id"]
            # Just update last_seen_at and user_id (do not increment total_visits on page view)
            try:
                update_payload = {
                    "last_seen_at": "now()"
                }
                if event.user_id:
                    update_payload["user_id"] = event.user_id
                db.table("visitors").update(update_payload, returning='minimal').eq("id", visitor_id).execute()
            except Exception as inc_err:
                logger.warning(f"Visitor update failed: {inc_err}")
            
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
            
            # Since this is a NEW session (visit) for an EXISTING visitor, increment total_visits
            if not is_new_visitor:
                try:
                    v_data_resp = db.table("visitors").select("total_visits").eq("id", visitor_id).execute()
                    current_visits = v_data_resp.data[0].get("total_visits", 1) if v_data_resp.data else 1
                    db.table("visitors").update({"total_visits": current_visits + 1}, returning='minimal').eq("id", visitor_id).execute()
                except Exception as inc_err:
                    logger.warning(f"Failed to increment visitor total_visits: {inc_err}")
        else:
            session_id = session_resp.data[0]["id"]
            # Update session end time on every hit
            try:
                s_data = db.table("sessions").select("page_count").eq("id", session_id).execute()
                current_pages = s_data.data[0].get("page_count", 1) if s_data.data else 1
                db.table("sessions").update({
                    "ended_at": "now()",
                    "is_bounce": False,
                    "page_count": current_pages + 1
                }, returning='minimal').eq("id", session_id).execute()
            except Exception as inc_err:
                logger.warning(f"Session page count update failed: {inc_err}")
 
        # 5. INSERT Page View
        db.table("page_views").insert({
            "session_id": session_id,
            "visitor_id": visitor_id,
            "page_path": event.page_path,
            "page_title": event.page_title,
            "referrer_page": event.referrer
        }, returning='minimal').execute()
        
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

