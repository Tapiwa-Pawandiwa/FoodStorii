"""
Meal plan node — assigns recipes to day/meal slots.
Auto-adds missing ingredients to shopping list.
"""
from langchain_core.messages import SystemMessage
from agent.state import AgentState
from agent.llm import llm
from agent.nodes import execute_tool_calls
from skills.shopping_skill import get_missing_ingredients, add_to_shopping_list
from skills.memory_skill import log_interaction_event
from langchain_core.tools import tool
import db.queries as q


@tool
async def get_meal_plan(household_id: str) -> str:
    """Get the current meal plan for the next 7 days."""
    result = await q.get_meal_plan(household_id)
    return str(result) if result else "No meals planned yet."


@tool
async def add_to_meal_plan(household_id: str, user_id: str, recipe_name: str, slot_date: str, meal_type: str = "dinner", recipe_external_id: str = "") -> str:
    """Add a recipe to the meal plan for a specific date and meal type.
    meal_type: breakfast | lunch | dinner | snack
    slot_date: YYYY-MM-DD format"""
    result = await q.add_to_meal_plan(household_id, user_id, recipe_name, slot_date, meal_type, recipe_external_id or None)
    return f"Added '{recipe_name}' to meal plan for {slot_date} ({meal_type})."


TOOLS = [get_meal_plan, add_to_meal_plan, get_missing_ingredients, add_to_shopping_list, log_interaction_event]
TOOL_MAP = {t.name: t for t in TOOLS}
MODEL = llm.bind_tools(TOOLS)


async def node(state: AgentState) -> dict:
    messages = state["messages"]
    last = messages[-1] if messages else None

    if last and hasattr(last, "tool_calls") and last.tool_calls:
        tool_msgs = await execute_tool_calls(last, TOOL_MAP)
        return {
            "messages": tool_msgs,
            "iteration_count": state.get("iteration_count", 0) + 1,
        }

    system = SystemMessage(content=state.get("context_snapshot", ""))
    response = await MODEL.ainvoke([system] + list(messages))

    return {
        "messages": [response],
        "current_mode": "meal_plan",
        "message_type": "text_bubble",
        "quick_replies": [],
        "iteration_count": state.get("iteration_count", 0) + 1,
    }
