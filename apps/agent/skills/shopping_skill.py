"""
Shopping skill tools.
NOTE: checking items off shopping list does NOT update inventory — only barcode/receipt scan does.
"""
from langchain_core.tools import tool
import db.queries as q


@tool
async def get_shopping_list(household_id: str) -> str:
    """Get the current active shopping list with all items."""
    result = await q.get_shopping_list(household_id)
    return str(result) if result else "No active shopping list."


@tool
async def create_shopping_list(household_id: str, user_id: str) -> str:
    """Create a new active shopping list for the household."""
    result = await q.create_shopping_list(household_id, user_id)
    return f"Shopping list created. ID: {result['id']}"


@tool
async def add_to_shopping_list(list_id: str, items: list) -> str:
    """Add items to an existing shopping list.
    Each item dict: {name, quantity?, unit?, category?}
    WARNING: Adding items here does NOT update kitchen inventory."""
    await q.add_to_shopping_list(list_id, items)
    return f"Added {len(items)} item(s) to shopping list."


@tool
async def get_missing_ingredients(household_id: str, external_id: str) -> str:
    """Get the list of ingredients missing from inventory for a given recipe external_id."""
    result = await q.get_missing_ingredients(household_id, external_id)
    if not result:
        return "All ingredients are available in your kitchen."
    return f"Missing: {', '.join(result)}"
