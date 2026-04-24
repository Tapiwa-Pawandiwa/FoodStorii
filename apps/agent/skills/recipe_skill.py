"""
Recipe skill tools.
Works with external_recipes_cache for recipe discovery and detail.
"""
from langchain_core.tools import tool
import db.queries as q


@tool
async def find_recipes_by_inventory(household_id: str, max_missing: int = 3, limit: int = 5) -> str:
    """Find recipes that can be made with current kitchen inventory.
    Ranks by: 1) expiring items first, 2) fewest missing ingredients.
    max_missing: max number of ingredients allowed to be missing (default 3).
    limit: max recipes to return (default 5)."""
    results = await q.find_recipes_by_inventory(household_id, max_missing, limit)
    if not results:
        return "No matching recipes found with current inventory."
    return str(results)


@tool
async def get_recipe_detail(external_id: str) -> str:
    """Get full recipe details from the cache by external_id."""
    result = await q.get_recipe_detail(external_id)
    return str(result) if result else "Recipe not found."


@tool
async def save_recipe(recipe_data: dict) -> str:
    """Save or update a recipe in the external_recipes_cache.
    recipe_data must include: external_id, title, source, ingredients_json"""
    result = await q.save_recipe(recipe_data)
    return f"Recipe '{result.get('title', '')}' saved."


@tool
async def get_inventory_snapshot_for_recipe(household_id: str) -> str:
    """Get kitchen inventory snapshot — for use in recipe mode to check ingredient availability."""
    data = await q.get_inventory_snapshot(household_id)
    return str(data)
