"""
Memory skill — interaction event logging.
Used across all modes to maintain the append-only audit trail.
"""
from langchain_core.tools import tool
import db.queries as q


@tool
async def log_interaction_event(household_id: str, user_id: str, event_type: str, payload: dict) -> str:
    """Log a significant user or system action to the interaction_events audit log.
    event_type examples: recipe_suggested, cook_confirmed, item_added, shopping_updated, nudge_sent"""
    await q.log_interaction_event(household_id, user_id, event_type, payload)
    return "Event logged."
