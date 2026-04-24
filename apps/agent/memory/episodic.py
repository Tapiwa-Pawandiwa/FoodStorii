"""
Tier 2 episodic memory — Supabase memory_summaries.
Triggered when thread hits MAX_THREAD_MESSAGES.
Summarises with Claude Haiku, stores in memory_summaries.
Injected into context via build_memory_block() — never inject full messages.
"""
import json
from langchain_anthropic import ChatAnthropic
from db.queries import save_thread_summary, get_thread_messages_from_db
from session.cache import set_thread_messages
from config import settings

_summariser = ChatAnthropic(
    model=settings.claude_haiku_model,
    api_key=settings.anthropic_api_key,
    max_tokens=300,
    temperature=0,
)

SUMMARY_PROMPT = (
    "Summarise this conversation in 2-3 sentences. "
    "Capture: what the user wanted, what Tina did, what changed in the kitchen, any preferences revealed. "
    "Be specific. No generic summaries."
)


async def summarise_and_store(thread_id: str, household_id: str) -> str:
    """
    Summarise the current thread messages with Haiku, store in memory_summaries,
    then clear the working memory cache so the thread starts fresh.
    Returns the summary text.
    """
    messages = await get_thread_messages_from_db(thread_id, limit=settings.max_thread_messages)
    if not messages:
        return ""

    conversation_text = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)

    response = await _summariser.ainvoke([
        {"role": "system", "content": SUMMARY_PROMPT},
        {"role": "user", "content": conversation_text},
    ])
    summary = response.content.strip()

    await save_thread_summary(thread_id, household_id, summary)
    # Reset working memory cache — next load will start with empty message list
    await set_thread_messages(thread_id, [])

    return summary


async def maybe_summarise(thread_id: str, household_id: str, message_count: int) -> str | None:
    """Call this after each message append. Returns summary if triggered, else None."""
    if message_count >= settings.max_thread_messages:
        return await summarise_and_store(thread_id, household_id)
    return None
