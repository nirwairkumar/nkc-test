from fastapi import APIRouter, HTTPException, Depends, Request
from app.core.database import get_db, supabase
from supabase import Client
from typing import Optional, List, Any, Dict
from pydantic import BaseModel

router = APIRouter()

def _verify_admin_for_pricing(request: Request, db: Client) -> str:
    """Verify JWT from Authorization header and ensure the user is an admin."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth_header.replace("Bearer ", "")
    try:
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = user_response.user.id
        user_email = user_response.user.email
        
        # Check admin status
        admin_res = supabase.table("admins").select("email").eq("email", user_email).execute()
        if not admin_res.data:
            raise HTTPException(status_code=403, detail="Admin authorization required")
        return user_id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")

# --- Schemas ---

class PlanCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    price: int # paise
    duration_days: int
    features: List[str] = []
    is_active: bool = True

class PromoCodeCreate(BaseModel):
    code: str
    type: str # 'flat' or 'percentage'
    value: int
    max_discount: Optional[int] = None
    min_order_value: int = 0
    max_uses: Optional[int] = None
    valid_from: str
    valid_till: Optional[str] = None
    is_active: bool = True

# --- Plans Endpoints ---

@router.get("/plans")
async def get_plans(db: Client = Depends(get_db)):
    try:
        response = db.table("plans").select("*").order("price", desc=False).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/plans")
async def create_plan(payload: PlanCreate, request: Request, db: Client = Depends(get_db)):
    try:
        _verify_admin_for_pricing(request, db)
        data = payload.dict(exclude_unset=True)
        response = db.table("plans").insert(data).execute()
        if response.data:
            return response.data[0]
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create plan")

@router.put("/plans/{plan_id}")
async def update_plan(plan_id: str, payload: Dict[str, Any], request: Request, db: Client = Depends(get_db)):
    try:
        _verify_admin_for_pricing(request, db)
        response = db.table("plans").update(payload).eq("id", plan_id).execute()
        if response.data:
            return response.data[0]
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update plan")

@router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str, request: Request, db: Client = Depends(get_db)):
    try:
        _verify_admin_for_pricing(request, db)
        response = db.table("plans").delete().eq("id", plan_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete plan")

# --- Promo Codes Endpoints ---

@router.get("/promos")
async def get_promos(db: Client = Depends(get_db)):
    try:
        response = db.table("promo_codes").select("*").order("created_at", desc=False).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching promos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/promos")
async def create_promo(payload: PromoCodeCreate, request: Request, db: Client = Depends(get_db)):
    try:
        _verify_admin_for_pricing(request, db)
        data = payload.dict(exclude_unset=True)
        response = db.table("promo_codes").insert(data).execute()
        if response.data:
            return response.data[0]
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create promo")

@router.put("/promos/{promo_id}")
async def update_promo(promo_id: str, payload: Dict[str, Any], request: Request, db: Client = Depends(get_db)):
    try:
        _verify_admin_for_pricing(request, db)
        response = db.table("promo_codes").update(payload).eq("id", promo_id).execute()
        if response.data:
            return response.data[0]
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update promo")

@router.delete("/promos/{promo_id}")
async def delete_promo(promo_id: str, request: Request, db: Client = Depends(get_db)):
    try:
        _verify_admin_for_pricing(request, db)
        response = db.table("promo_codes").delete().eq("id", promo_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete promo")

class ApplyPromoRequest(BaseModel):
    code: str
    plan_id: str

@router.post("/promos/apply")
async def apply_promo(payload: ApplyPromoRequest, db: Client = Depends(get_db)):
    try:
        code = payload.code.strip().upper()
        print(f"DEBUG API: code={code}, plan={payload.plan_id}")
        # Fetch Promo using admin client (to bypass RLS for users)
        promo_res = supabase.table("promo_codes").select("*").eq("code", code).eq("is_active", True).execute()
        print(f"DEBUG PROMO_RES: {promo_res.data}")
        if not promo_res.data:
            raise HTTPException(status_code=400, detail="Invalid or inactive promo code")
        
        promo = promo_res.data[0]
        
        # Check Validity Dates
        import datetime
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if promo.get("valid_from") and promo["valid_from"] > now:
             raise HTTPException(status_code=400, detail="Promo code not yet valid")
        if promo.get("valid_till") and promo["valid_till"] < now:
             raise HTTPException(status_code=400, detail="Promo code expired")
             
        # Check Usage Limits
        if promo.get("max_uses") is not None:
            if promo.get("used_count", 0) >= promo["max_uses"]:
                raise HTTPException(status_code=400, detail="Promo code usage limit reached")

        # Fetch Plan
        plan_res = db.table("plans").select("*").eq("id", payload.plan_id).single().execute()
        if not plan_res.data:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        plan_price = plan_res.data["price"]
        
        # Check Min Order Value
        if promo.get("min_order_value", 0) > plan_price:
             raise HTTPException(status_code=400, detail=f"Minimum order value of {promo['min_order_value']/100} required")

        # Calculate Discount
        discount = 0
        if promo["type"] == "flat":
            discount = promo["value"]
        elif promo["type"] == "percentage":
            discount = int(plan_price * (promo["value"] / 100))
            if promo.get("max_discount"):
                discount = min(discount, promo["max_discount"])
        
        final_price = max(0, plan_price - discount)
        
        return {
            "code": code,
            "discount": discount,
            "finalPrice": final_price,
            "originalPrice": plan_price
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error applying promo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Global Premium Settings Endpoints ---

@router.get("/settings")
async def get_premium_settings(db: Client = Depends(get_db)):
    """Get global premium unlock settings"""
    try:
        response = db.table("app_settings").select("*").limit(1).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        # Return default if no settings exist
        return {"unlock_all_premium": False}
    except Exception as e:
        print(f"Error fetching premium settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UpdateSettingsRequest(BaseModel):
    unlock_all_premium: bool

@router.put("/settings")
async def update_premium_settings(payload: UpdateSettingsRequest, request: Request, db: Client = Depends(get_db)):
    """Update global premium unlock settings (admin only)"""
    try:
        _verify_admin_for_pricing(request, db)
        # Get the first (and should be only) settings row
        settings_res = db.table("app_settings").select("id").limit(1).execute()
        
        if settings_res.data and len(settings_res.data) > 0:
            settings_id = settings_res.data[0]["id"]
            # Update existing settings
            response = db.table("app_settings").update({
                "unlock_all_premium": payload.unlock_all_premium
            }).eq("id", settings_id).execute()
            
            if response.data:
                return response.data[0]
        else:
            # Insert new settings if none exist
            response = db.table("app_settings").insert({
                "unlock_all_premium": payload.unlock_all_premium
            }).execute()
            
            if response.data:
                return response.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to update settings")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update settings")

@router.get("/check-premium-access")
async def check_premium_access(db: Client = Depends(get_db)):
    """
    Check if premium features should be accessible.
    Returns access status based on:
    1. Global unlock setting
    2. Active plans count
    3. User's subscription status
    """
    try:
        # Check global unlock setting
        settings_res = db.table("app_settings").select("unlock_all_premium").limit(1).execute()
        unlock_all = False
        if settings_res.data and len(settings_res.data) > 0:
            unlock_all = settings_res.data[0].get("unlock_all_premium", False)
        
        # Check if any active plans exist
        plans_res = db.table("plans").select("id").eq("is_active", True).limit(1).execute()
        has_active_plans = plans_res.data and len(plans_res.data) > 0
        
        # Count total active plans
        all_plans_res = db.table("plans").select("id", count="exact").eq("is_active", True).execute()
        active_plans_count = all_plans_res.count if all_plans_res.count is not None else 0
        
        return {
            "unlock_all_premium": unlock_all,
            "has_active_plans": has_active_plans,
            "active_plans_count": active_plans_count,
            "premium_accessible": unlock_all or not has_active_plans
        }
    except Exception as e:
        print(f"Error checking premium access: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/create-order")
async def create_order(payload: Dict[str, Any], db: Client = Depends(get_db)):
    try:
        # Invoke Edge Function (db client carries user auth)
        response = db.functions.invoke("create-order", {
            "body": payload
        })
        
        # Handle bytes response
        import json
        if isinstance(response, bytes):
            return json.loads(response.decode())
        return response
    except Exception as e:
        print(f"Error invoking create-order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-payment")
async def verify_payment(payload: Dict[str, Any], db: Client = Depends(get_db)):
    try:
        # Invoke Edge Function (db client carries user auth)
        response = db.functions.invoke("verify-payment", {
            "body": payload
        })

        import json
        if isinstance(response, bytes):
            return json.loads(response.decode())
        return response
    except Exception as e:
        print(f"Error invoking verify-payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))
