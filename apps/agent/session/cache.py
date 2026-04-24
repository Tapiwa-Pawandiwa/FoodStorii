import redis.asyncio as aioredis
import json
from config import settings

redis_client: aioredis.Redis = None

async def init_redis():
    global redis_client
    redis_client = aioredis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
    )

async def get_cached_context(key: str) -> str | None:
    return await redis_client.get(key)

async def set_cached_context(key: str, value: str):
    await redis_client.setex(key, settings.context_cache_ttl_seconds, value)

async def invalidate_context(household_id: str):
    # Call this whenever kitchen state changes
    pattern = f"context:{household_id}:*"
    keys = await redis_client.keys(pattern)
    if keys:
        await redis_client.delete(*keys)

async def get_thread_messages(thread_id: str) -> list:
    raw = await redis_client.get(f"thread:{thread_id}")
    return json.loads(raw) if raw else []

async def set_thread_messages(thread_id: str, messages: list):
    await redis_client.setex(
        f"thread:{thread_id}",
        settings.session_cache_ttl_seconds,
        json.dumps(messages)
    )
