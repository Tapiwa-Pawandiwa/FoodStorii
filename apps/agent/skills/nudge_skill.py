"""
Nudge skill tools — for proactive notification scheduling.
Used in proactive mode only.
"""
from langchain_core.tools import tool
import db.queries as q


@tool
async def get_expiring_items(household_id: str, days: int = 3) -> str:
    """Get inventory items expiring within the next N days (default 3).
    Use to decide which nudges to send."""
    result = await q.get_expiring_items(household_id, days)
    if not result:
        return "No items expiring soon."
    return str(result)


@tool
async def schedule_nudge(household_id: str, nudge_type: str, title: str, body: str, scheduled_for: str) -> str:
    """Schedule a push notification nudge for the household.
    nudge_type: daily_meal_nudge | expiry_warning | restock_reminder | post_dinner | weekly_summary
    scheduled_for: ISO 8601 UTC datetime string"""
    await q.schedule_nudge(household_id, nudge_type, title, body, scheduled_for)
    return f"Nudge '{nudge_type}' scheduled for {scheduled_for}."
