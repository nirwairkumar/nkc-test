from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from app.core.database import get_db
from app.utils.rate_limiter import check_analytics_rate_limit
from supabase import Client
from .models import PageViewEvent
from user_agents import parse
from .enrich import geo_from_headers
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


AI_BOT_KEYWORDS = [
    'gptbot', 'chatgpt-user', 'claudebot', 'perplexitybot', 'anthropic-ai',
    'bytespider', 'ccbot', 'diffbot', 'cohere-ai', 'img2dataset',
    'applebot-extended', 'meta-externalagent', 'google-extended'
]

SEARCH_BOT_KEYWORDS = [
    'googlebot', 'bingbot', 'yandexbot', 'yandex', 'baiduspider',
    'duckduckbot', 'slurp', 'sogou', 'facebookexternalhit', 'twitterbot',
    'linkedinbot', 'slackbot', 'ahrefsbot', 'semrushbot'
]

SCRIPT_KEYWORDS = [
    'python-requests', 'httpx', 'aiohttp', 'curl', 'wget', 'headlesschrome',
    'puppeteer', 'playwright', 'selenium', 'phantomjs', 'cypress', 'postman',
    'go-http-client', 'java/', 'apache-httpclient', 'libwww-perl', 'scrapy'
]

def classify_user_agent(ua_string: str, parsed_ua=None):
    ua_lower = (ua_string or "").lower()
    
    # 1. AI Bots
    for k in AI_BOT_KEYWORDS:
        if k in ua_lower:
            return {"is_bot": True, "category": "ai_bot", "label": f"AI Bot ({k})"}
        
    # 2. Search & Social Crawlers
    for k in SEARCH_BOT_KEYWORDS:
        if k in ua_lower:
            return {"is_bot": True, "category": "search_bot", "label": f"Search Crawler ({k})"}

    # 3. Scripts / Automation Tools
    for k in SCRIPT_KEYWORDS:
        if k in ua_lower:
            return {"is_bot": True, "category": "automated_script", "label": f"Automated Script ({k})"}

    # 4. Standard bot check via user_agents library
    if parsed_ua and getattr(parsed_ua, 'is_bot', False):
        bot_family = parsed_ua.browser.family or "Crawler"
        return {"is_bot": True, "category": "bot", "label": f"Bot/Crawler ({bot_family})"}

    if "bot" in ua_lower or "crawler" in ua_lower or "spider" in ua_lower:
        return {"is_bot": True, "category": "bot", "label": "Web Crawler"}

    return {"is_bot": False, "category": "human", "label": "Real Human"}


async def process_analytics_event(event: PageViewEvent, geo: dict, db: Client):
    try:
        # 1. Parse User Agent & Classify Traffic
        ua_string = event.user_agent or ""
        user_agent = parse(ua_string)
        traffic_info = classify_user_agent(ua_string, user_agent)
        
        device_type = "desktop"
        if user_agent.is_mobile:
            device_type = "mobile"
        elif user_agent.is_tablet:
            device_type = "tablet"
            
        browser = f"{user_agent.browser.family} {user_agent.browser.version_string}"
        if traffic_info["is_bot"]:
            browser = f"{traffic_info['label']}"
            
        os = f"{user_agent.os.family} {user_agent.os.version_string}"
        
        # 2. Location from Cloudflare's edge headers. This used to send every visitor's
        #    IP to ip-api.com over plain HTTP (whose free tier forbids commercial use).
        country = geo.get("country_code") or "Unknown"
        city = geo.get("city") or "Unknown"
        
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
    # Legacy v1 beacon (pages cached before analytics v2). Offload the DB writes.
    background_tasks.add_task(process_analytics_event, event, geo_from_headers(request.headers), db)
    return

