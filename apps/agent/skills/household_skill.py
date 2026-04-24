"""
Household profile skill tools.
Used primarily in profiling mode to capture and update household preferences.
"""
from langchain_core.tools import tool
import db.queries as q


@tool
async def get_household_profile(household_id: str) -> str:
    """Get the full household profile including dietary preferences, primary driver, and onboarding status."""
    result = await q.get_household_profile(household_id)
    return str(result) if result else "No profile found."


@tool
async def update_household_profile(household_id: str, updates: dict) -> str:
    """Update one or more fields of the household profile.
    Allowed fields: household_size, cooking_style, dietary_preferences, health_goals,
    store_preferences, food_waste_pain_points, notification_tolerance, automation_readiness,
    primary_driver, decision_hour, avoid_ingredients, picky_eaters, onboarding_status.
    To complete onboarding: set onboarding_status='completed'."""
    result = await q.update_household_profile(household_id, updates)
    return f"Profile updated: {list(updates.keys())}"
