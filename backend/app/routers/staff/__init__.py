"""
Team dashboard API (team.testoza.com). Plan: TestoZa/Team-Dashboard/TEAM_DASHBOARD_PLAN.md

  router        → /api/staff/*        employees (cookie session + 6-digit code + permissions)
  admin_router  → /api/staff-admin/*  the owner, from admin.testoza.com → Team
"""

from fastapi import APIRouter

from . import admin, auth, modules

router = APIRouter()
router.include_router(auth.router, prefix="/auth")
router.include_router(modules.router)

admin_router = admin.router
