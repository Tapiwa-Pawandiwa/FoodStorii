"""
Thread lifecycle manager.
Handles thread create/load, mode updates, and message recording through the memory manager.
"""
from db.queries import get_thread_by_id, create_thread, update_thread_mode
from memory.manager import load_thread_memory, record_message
from session.cache import get_thread_messages


async def load_thread(thread_id: str, household_id: str, user_id: str) -> dict:
    """
    Load or create a conversation thread.
    Returns state dict with {current_mode, messages, thread_id}.
    """
    thread = await get_thread_by_id(thread_id)
    if not thread:
        thread = await create_thread(household_id, user_id)

    messages = await load_thread_memory(thread_id)

    return {
        "thread_id": thread["id"],
        "current_mode": thread.get("current_mode", "idle"),
        "message_count": thread.get("message_count", 0),
        "messages": messages,
    }


async def add_message(thread_id: str, role: str, content: str, message_type: str = "text_bubble") -> None:
    """
    Record a new message. Triggers episodic summarisation if at message cap.
    Always call this for both human and assistant messages.
    """
    # Determine household_id for episodic summarisation trigger
    thread = await get_thread_by_id(thread_id)
    household_id = thread["household_id"] if thread else None

    await record_message(thread_id, household_id, role, content, message_type)

    if thread:
        new_count = thread.get("message_count", 0) + 1
        await update_thread_mode(thread_id, thread.get("current_mode", "idle"), new_count)


async def update_mode(thread_id: str, mode: str) -> None:
    """Update the FSM mode stored on the thread record."""
    thread = await get_thread_by_id(thread_id)
    if thread:
        await update_thread_mode(thread_id, mode, thread.get("message_count", 0))
