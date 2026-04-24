"""
JWT auth middleware and dependency for FastAPI.
Validates Supabase-issued JWTs using HS256 + JWT_SECRET.
Resolves household_id from the users table.
"""
import structlog
from fastapi import Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
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

        # All other routes require a valid Supabase user JWT
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse({"error": "Missing Authorization header"}, status_code=401)

        token = auth_header.removeprefix("Bearer ").strip()
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], options={"verify_aud": False})
            request.state.user_id = payload.get("sub")
            request.state.jwt_payload = payload
        except JWTError as e:
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
