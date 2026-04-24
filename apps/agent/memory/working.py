"""
Tier 1 working memory — Redis thread message cache.
Key: thread:{thread_id}  TTL: SESSION_CACHE_TTL_SECONDS (1 hour)
On cache miss: loads from thread_messages Supabase table.
Max messages: MAX_THREAD_MESSAGES — triggers summarisation when reached.
"""
from session.cache import get_thread_messages, set_thread_messages
from db.queries import get_thread_messages_from_db, save_thread_message
from config import settings


async def load_messages(thread_id: str) -> list[dict]:
    """Load thread messages from Redis, falling back to Supabase on cache miss."""
    cached = await get_thread_messages(thread_id)
    if cached:
        return cached
    messages = await get_thread_messages_from_db(thread_id, limit=settings.max_thread_messages)
    if messages:
        await set_thread_messages(thread_id, messages)
    return messages


async def append_message(thread_id: str, role: str, content: str, message_type: str = "text_bubble") -> list[dict]:
    """Append a new message to working memory (Redis + Supabase)."""
    messages = await load_messages(thread_id)
    messages.append({"role": role, "content": content})
    await set_thread_messages(thread_id, messages)
    await save_thread_message(thread_id, role, content, message_type)
    return messages


async def get_message_count(thread_id: str) -> int:
    messages = await load_messages(thread_id)
    return len(messages)


async def is_at_cap(thread_id: str) -> bool:
    count = await get_message_count(thread_id)
    return count >= settings.max_thread_messages
