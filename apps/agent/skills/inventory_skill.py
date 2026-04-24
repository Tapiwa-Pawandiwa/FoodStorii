"""
Inventory skill tools.
Each tool accepts household_id from the system prompt context.
Every write operation logs to interaction_events.
"""
from langchain_core.tools import tool
import db.queries as q


@tool
async def get_inventory_snapshot(household_id: str) -> str:
    """Get the current kitchen inventory snapshot grouped by storage location (fridge, pantry, freezer).
    Returns items with quantity tiers and expiry flags."""
    data = await q.get_inventory_snapshot(household_id)
    return str(data)


@tool
async def add_inventory_items(household_id: str, user_id: str, items: list) -> str:
    """Add one or more items to the kitchen inventory.
    Each item dict: {name, category?, storage_location?, quantity_tier?, countable_quantity?, expiry_estimate?, confidence?}"""
    result = await q.add_inventory_items(household_id, user_id, items)
    return f"Added {len(result)} item(s) to inventory."


@tool
async def update_quantity_tier(item_id: str, tier: str, household_id: str, user_id: str) -> str:
    """Update the quantity tier of an existing inventory item.
    tier must be one of: just_opened, mostly_full, more_than_half, about_half, less_than_half, almost_empty, finished"""
    await q.update_quantity_tier(item_id, tier, household_id, user_id)
    return f"Quantity tier updated to '{tier}'."


@tool
async def deplete_item(item_id: str, household_id: str, user_id: str) -> str:
    """Mark an inventory item as fully consumed (status=consumed, tier=finished).
    Use after a cook confirm or when user says they used/threw out an item."""
    await q.deplete_item(item_id, household_id, user_id)
    return "Item marked as consumed."


@tool
async def log_interaction_event(household_id: str, user_id: str, event_type: str, payload: dict) -> str:
    """Log a significant event to the interaction_events audit log.
    event_type examples: inventory_add, inventory_deplete, cook_confirmed, recipe_suggested"""
    await q.log_interaction_event(household_id, user_id, event_type, payload)
    return "Event logged."


@tool
async def reconcile_extraction_items(household_id: str, user_id: str, items: list) -> str:
    """Reconcile a list of extracted items (from receipt/photo) with existing inventory.
    Updates existing items by name match, inserts new ones.
    Each item dict: {name, quantity_tier?, expiry_estimate?, category?, storage_location?}"""
    result = await q.reconcile_extraction_items(household_id, user_id, items)
    return str(result)
