"""
Memory manager — coordinates all three memory tiers.
Tier 1: Redis working memory (session.cache)
Tier 2: Supabase episodic summaries (memory.episodic)
Tier 3: pgvector semantic retrieval (memory.semantic) — future use
"""
from memory.working import load_messages, append_message, get_message_count
from memory.episodic import maybe_summarise


async def load_thread_memory(thread_id: str) -> list[dict]:
    """Load current working messages for a thread."""
    return await load_messages(thread_id)


async def record_message(thread_id: str, household_id: str, role: str, content: str, message_type: str = "text_bubble") -> None:
    """
    Append a message and trigger episodic summarisation if at the cap.
    Always call this after each message (human or assistant).
    """
    await append_message(thread_id, role, content, message_type)
    count = await get_message_count(thread_id)
    await maybe_summarise(thread_id, household_id, count)
