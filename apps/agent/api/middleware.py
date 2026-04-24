"""
JWT auth middleware and dependency for FastAPI.
Validates Supabase-issued JWTs by calling supabase.auth.get_user(token) —
the same pattern used by all Supabase Edge Functions via resolveAuth().
This works with both the legacy JWT secret and the new Supabase signing key formats.
"""
import structlog
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from config import settings
from db.supabase import get_supabase

log = structlog.get_logger()

# Routes that bypass JWT validation
PUBLIC_PATHS = {"/health", "/metrics", "/docs", "/openapi.json", "/redoc"}


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in PUBLIC_PATHS or request.method == "OPTIONS":
            return await call_next(request)

        # /internal/* routes use INTERNAL_SECRET, not user JWT
        if request.url.path.startswith("/internal/"):
            auth = request.headers.get("Authorization", "")
            if auth != f"Bearer {settings.internal_secret}":
                return JSONResponse({"error": "Unauthorized"}, status_code=401)
            return await call_next(request)

        # All other routes: validate via Supabase auth.get_user()
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse({"error": "Missing Authorization header"}, status_code=401)

        token = auth_header.removeprefix("Bearer ").strip()
        try:
            db = get_supabase()
            response = await db.auth.get_user(token)
            user = response.user
            if not user:
                return JSONResponse({"error": "Invalid or expired token"}, status_code=401)
            request.state.user_id = user.id
            request.state.token = token
        except Exception as e:
            log.warning("jwt_validation_failed", error=str(e))
            return JSONResponse({"error": "Invalid or expired token"}, status_code=401)

        return await call_next(request)


async def get_current_user(request: Request) -> dict:
    """FastAPI dependency: returns {id, household_id} for the authenticated user."""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db = get_supabase()
    res = await db.table("users").select("id, household_id").eq("id", user_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="User not found")

    return {"id": res.data["id"], "household_id": res.data.get("household_id")}
