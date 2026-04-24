import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from api.routes import chat, proactive, health
from api.middleware import AuthMiddleware
from db.supabase import init_supabase
from session.cache import init_redis
from agent.graph import init_graph
from config import settings

log = structlog.get_logger()

app = FastAPI(title="FoodStorii Agent API", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.add_middleware(AuthMiddleware)

app.include_router(chat.router, prefix="/chat")
app.include_router(proactive.router, prefix="/internal")
app.include_router(health.router)

Instrumentator().instrument(app).expose(app)

@app.on_event("startup")
async def startup():
    await init_supabase()
    await init_redis()
    init_graph()
    log.info("FoodStorii agent service started", environment=settings.environment)
