"""
Dynamic Sitemap Generation API for TestoZa
Optimized for Google/Bing crawlers and Cloudflare edge caching
"""

from fastapi import APIRouter, Response, Depends, Request
from fastapi.responses import Response as XMLResponse
from supabase import Client
from app.core.database import get_db
from datetime import datetime, timezone
from typing import List, Optional, Dict
import xml.etree.ElementTree as ET
import os
import time

router = APIRouter(prefix="/sitemap", tags=["sitemap"])

SITE_URL = os.getenv("SITE_URL", "https://testoza.com").rstrip("/")
CACHE_TTL_SECONDS = 3600  # 1 hour

class MemoryCacheManager:
    """In-memory cache with TTL support (no external Redis dependency required)"""
    def __init__(self):
        self._cache: Dict[str, tuple[str, float]] = {}  # key -> (xml_str, expire_timestamp)

    def get(self, key: str) -> Optional[str]:
        if key in self._cache:
            content, expires_at = self._cache[key]
            if time.time() < expires_at:
                return content
            del self._cache[key]
        return None

    def set(self, key: str, content: str, ttl: int = CACHE_TTL_SECONDS):
        self._cache[key] = (content, time.time() + ttl)

    def invalidate_all(self):
        self._cache.clear()

cache_manager = MemoryCacheManager()

STATIC_PAGES = [
    {"loc": "/", "priority": "1.0", "changefreq": "daily"},
    {"loc": "/quiz-creator", "priority": "0.95", "changefreq": "weekly"},
    {"loc": "/assessment-platform", "priority": "0.95", "changefreq": "weekly"},
    {"loc": "/generate-with-ai", "priority": "0.9", "changefreq": "weekly"},
    {"loc": "/create-test", "priority": "0.85", "changefreq": "weekly"},
    {"loc": "/more-tests", "priority": "0.85", "changefreq": "daily"},
    {"loc": "/pricing", "priority": "0.8", "changefreq": "monthly"},
    {"loc": "/premium", "priority": "0.8", "changefreq": "monthly"},
    {"loc": "/about", "priority": "0.7", "changefreq": "monthly"},
    {"loc": "/support", "priority": "0.7", "changefreq": "monthly"},
    {"loc": "/convert", "priority": "0.7", "changefreq": "monthly"},
    {"loc": "/survey", "priority": "0.6", "changefreq": "monthly"},
    {"loc": "/user-guide", "priority": "0.7", "changefreq": "monthly"},
    {"loc": "/privacy-policy", "priority": "0.4", "changefreq": "yearly"},
    {"loc": "/terms-and-conditions", "priority": "0.4", "changefreq": "yearly"},
]

def escape_xml(text: str) -> str:
    if not text:
        return ""
    return (str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;"))

def generate_url_element(url_data: dict) -> ET.Element:
    url_elem = ET.Element("url")
    
    loc = ET.SubElement(url_elem, "loc")
    loc_val = url_data["loc"]
    loc.text = loc_val if loc_val.startswith("http") else f"{SITE_URL}{loc_val}"
    
    if "lastmod" in url_data:
        lastmod = ET.SubElement(url_elem, "lastmod")
        lastmod.text = str(url_data["lastmod"])
    
    if "changefreq" in url_data:
        changefreq = ET.SubElement(url_elem, "changefreq")
        changefreq.text = str(url_data["changefreq"])
    
    if "priority" in url_data:
        priority = ET.SubElement(url_elem, "priority")
        priority.text = str(url_data["priority"])
    
    if "image" in url_data:
        image = ET.SubElement(url_elem, "{http://www.google.com/schemas/sitemap-image/1.1}image")
        image_loc = ET.SubElement(image, "{http://www.google.com/schemas/sitemap-image/1.1}loc")
        image_loc.text = url_data["image"]
        if "image_title" in url_data and url_data["image_title"]:
            image_title = ET.SubElement(image, "{http://www.google.com/schemas/sitemap-image/1.1}title")
            image_title.text = escape_xml(url_data["image_title"])
    
    return url_elem

def build_sitemap_xml(urls: List[dict]) -> str:
    root = ET.Element("urlset")
    root.set("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")
    root.set("xmlns:image", "http://www.google.com/schemas/sitemap-image/1.1")
    
    for url_data in urls:
        url_elem = generate_url_element(url_data)
        root.append(url_elem)
    
    xml_string = ET.tostring(root, encoding="utf-8").decode("utf-8")
    return f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_string}'

def build_sitemap_index(sitemaps: List[dict]) -> str:
    root = ET.Element("sitemapindex")
    root.set("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    for sitemap_data in sitemaps:
        sitemap_elem = ET.SubElement(root, "sitemap")
        
        loc = ET.SubElement(sitemap_elem, "loc")
        loc.text = sitemap_data["loc"]
        
        lastmod = ET.SubElement(sitemap_elem, "lastmod")
        lastmod.text = sitemap_data.get("lastmod", today)
    
    xml_string = ET.tostring(root, encoding="utf-8").decode("utf-8")
    return f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_string}'


# =============================================================================
# SITEMAP INDEX ENDPOINTS
# =============================================================================

@router.get("/index.xml", response_class=XMLResponse)
@router.get("/sitemap.xml", response_class=XMLResponse)
@router.get("/sitemap_index.xml", response_class=XMLResponse)
@router.get("/", response_class=XMLResponse)
async def get_sitemap_index():
    cache_key = "sitemap:index"
    cached = cache_manager.get(cache_key)
    if cached:
        return XMLResponse(
            content=cached,
            media_type="application/xml; charset=utf-8",
            headers={"Cache-Control": "public, max-age=3600", "X-Cache": "HIT"}
        )
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    sitemaps = [
        {"loc": f"{SITE_URL}/sitemap/static.xml", "lastmod": today},
        {"loc": f"{SITE_URL}/sitemap/tests.xml", "lastmod": today},
        {"loc": f"{SITE_URL}/sitemap/categories.xml", "lastmod": today},
        {"loc": f"{SITE_URL}/sitemap/posts.xml", "lastmod": today},
        {"loc": f"{SITE_URL}/sitemap/creators.xml", "lastmod": today},
    ]
    
    xml_content = build_sitemap_index(sitemaps)
    cache_manager.set(cache_key, xml_content, ttl=3600)
    
    return XMLResponse(
        content=xml_content,
        media_type="application/xml; charset=utf-8",
        headers={"Cache-Control": "public, max-age=3600", "X-Cache": "MISS"}
    )


# =============================================================================
# SUB-SITEMAP ENDPOINTS
# =============================================================================

@router.get("/static.xml", response_class=XMLResponse)
async def get_static_sitemap():
    cache_key = "sitemap:static"
    cached = cache_manager.get(cache_key)
    if cached:
        return XMLResponse(
            content=cached,
            media_type="application/xml; charset=utf-8",
            headers={"Cache-Control": "public, max-age=86400", "X-Cache": "HIT"}
        )
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    urls = [{**page, "lastmod": today} for page in STATIC_PAGES]
    
    xml_content = build_sitemap_xml(urls)
    cache_manager.set(cache_key, xml_content, ttl=86400)
    
    return XMLResponse(
        content=xml_content,
        media_type="application/xml; charset=utf-8",
        headers={"Cache-Control": "public, max-age=86400", "X-Cache": "MISS"}
    )


@router.get("/tests.xml", response_class=XMLResponse)
async def get_tests_sitemap(db: Client = Depends(get_db)):
    cache_key = "sitemap:tests"
    cached = cache_manager.get(cache_key)
    if cached:
        return XMLResponse(
            content=cached,
            media_type="application/xml; charset=utf-8",
            headers={"Cache-Control": "public, max-age=3600", "X-Cache": "HIT"}
        )
    
    urls = []
    try:
        result = db.table("tests").select(
            "id, slug, title, created_at, updated_at, is_public, visibility"
        ).eq("is_public", True).neq("visibility", "private").execute()
        
        tests = result.data if result and result.data else []
        for test in tests:
            url_path = f"/test/{test['slug']}" if test.get('slug') else f"/test-intro/{test['id']}"
            lastmod = test.get('updated_at') or test.get('created_at')
            if lastmod:
                lastmod = str(lastmod)[:10]
            else:
                lastmod = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            
            is_jee = "jee" in (test.get('title') or '').lower()
            
            urls.append({
                "loc": f"{SITE_URL}{url_path}",
                "lastmod": lastmod,
                "changefreq": "daily" if is_jee else "weekly",
                "priority": "0.9" if is_jee else "0.8",
                "image": f"{SITE_URL}/default-og.png",
                "image_title": test.get('title', 'Test')[:100]
            })
    except Exception as e:
        print(f"Error fetching tests for sitemap: {e}")
    
    xml_content = build_sitemap_xml(urls)
    cache_manager.set(cache_key, xml_content, ttl=3600)
    
    return XMLResponse(
        content=xml_content,
        media_type="application/xml; charset=utf-8",
        headers={"Cache-Control": "public, max-age=3600", "X-Cache": "MISS"}
    )


@router.get("/categories.xml", response_class=XMLResponse)
async def get_categories_sitemap(db: Client = Depends(get_db)):
    cache_key = "sitemap:categories"
    cached = cache_manager.get(cache_key)
    if cached:
        return XMLResponse(
            content=cached,
            media_type="application/xml; charset=utf-8",
            headers={"Cache-Control": "public, max-age=21600", "X-Cache": "HIT"}
        )
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    urls = []
    
    core_hubs = [
        {"slug": "jee-mains", "priority": "0.95"},
        {"slug": "jee-advanced", "priority": "0.95"},
        {"slug": "neet-ug", "priority": "0.95"},
        {"slug": "gate", "priority": "0.95"},
        {"slug": "cat", "priority": "0.95"},
        {"slug": "iit-jam", "priority": "0.90"},
        {"slug": "ssc", "priority": "0.85"},
    ]
    seen_slugs = set()
    for hub in core_hubs:
        seen_slugs.add(hub["slug"])
        urls.append({
            "loc": f"{SITE_URL}/tests/{hub['slug']}",
            "lastmod": today,
            "changefreq": "daily",
            "priority": hub["priority"]
        })
    
    try:
        result = db.table("categories").select("id, name, slug").execute()
        categories = result.data if result and result.data else []
        for cat in categories:
            slug = cat.get('slug') or cat['name'].lower().replace(' ', '-')
            if slug not in seen_slugs:
                seen_slugs.add(slug)
                urls.append({
                    "loc": f"{SITE_URL}/tests/{slug}",
                    "lastmod": today,
                    "changefreq": "weekly",
                    "priority": "0.75"
                })
    except Exception as e:
        print(f"Error fetching categories for sitemap: {e}")
    
    xml_content = build_sitemap_xml(urls)
    cache_manager.set(cache_key, xml_content, ttl=21600)
    
    return XMLResponse(
        content=xml_content,
        media_type="application/xml; charset=utf-8",
        headers={"Cache-Control": "public, max-age=21600", "X-Cache": "MISS"}
    )


@router.get("/posts.xml", response_class=XMLResponse)
async def get_posts_sitemap(db: Client = Depends(get_db)):
    cache_key = "sitemap:posts"
    cached = cache_manager.get(cache_key)
    if cached:
        return XMLResponse(
            content=cached,
            media_type="application/xml; charset=utf-8",
            headers={"Cache-Control": "public, max-age=7200", "X-Cache": "HIT"}
        )
    
    urls = []
    try:
        result = db.table("posts").select(
            "id, slug, title, updated_at, created_at, is_published"
        ).eq("is_published", True).execute()
        
        posts = result.data if result and result.data else []
        for post in posts:
            slug = post.get('slug') or post['id']
            lastmod = post.get('updated_at') or post.get('created_at')
            if lastmod:
                lastmod = str(lastmod)[:10]
            else:
                lastmod = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            
            urls.append({
                "loc": f"{SITE_URL}/news/{slug}",
                "lastmod": lastmod,
                "changefreq": "weekly",
                "priority": "0.8"
            })
    except Exception as e:
        print(f"Error fetching posts for sitemap: {e}")
    
    xml_content = build_sitemap_xml(urls)
    cache_manager.set(cache_key, xml_content, ttl=7200)
    
    return XMLResponse(
        content=xml_content,
        media_type="application/xml; charset=utf-8",
        headers={"Cache-Control": "public, max-age=7200", "X-Cache": "MISS"}
    )


@router.get("/creators.xml", response_class=XMLResponse)
async def get_creators_sitemap(db: Client = Depends(get_db)):
    cache_key = "sitemap:creators"
    cached = cache_manager.get(cache_key)
    if cached:
        return XMLResponse(
            content=cached,
            media_type="application/xml; charset=utf-8",
            headers={"Cache-Control": "public, max-age=21600", "X-Cache": "HIT"}
        )
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    urls = []
    try:
        result = db.table("profiles").select(
            "id, full_name, is_creator"
        ).eq("is_creator", True).execute()
        
        creators = result.data if result and result.data else []
        for creator in creators:
            urls.append({
                "loc": f"{SITE_URL}/creator/{creator['id']}",
                "lastmod": today,
                "changefreq": "weekly",
                "priority": "0.6"
            })
    except Exception as e:
        print(f"Error fetching creators for sitemap: {e}")
    
    xml_content = build_sitemap_xml(urls)
    cache_manager.set(cache_key, xml_content, ttl=21600)
    
    return XMLResponse(
        content=xml_content,
        media_type="application/xml; charset=utf-8",
        headers={"Cache-Control": "public, max-age=21600", "X-Cache": "MISS"}
    )
