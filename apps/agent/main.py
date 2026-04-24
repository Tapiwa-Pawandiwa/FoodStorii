import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from api.routes import health
from db.supabase import init_supabase
from session.cache import init_redis
from config import settings

log = structlog.get_logger()

app = FastAPI(title="FoodStorii Agent API", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(health.router)

Instrumentator().instrument(app).expose(app)

@app.on_event("startup")
async def startup():
    await init_supabase()
    await init_redis()
    log.info("FoodStorii agent service started", environment=settings.environment)
