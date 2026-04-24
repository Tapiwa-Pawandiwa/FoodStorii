"""
Cook confirm node — post-cook depletion flow.
Depletes ingredients, logs rescue events for expiring items used, creates recipes_cooked record.
Always routes to inventory node after completion (see graph.py edge).
"""
from langchain_core.messages import SystemMessage
from langchain_core.tools import tool
from agent.state import AgentState
from agent.llm import llm
from agent.nodes import execute_tool_calls
from skills.inventory_skill import get_inventory_snapshot, deplete_item, add_inventory_items, log_interaction_event
import db.queries as q


@tool
async def log_rescue_event(household_id: str, user_id: str, item_id: str, recipe_name: str, quantity_tier_at_rescue: str, estimated_saving_eur: float) -> str:
    """Log a rescue event when an expiring item is used in cooking.
    estimated_saving_eur: estimated euros saved by using this item before waste."""
    await q.log_rescue_event(household_id, user_id, item_id, recipe_name, quantity_tier_at_rescue, estimated_saving_eur)
    return "Rescue event logged."


@tool
async def create_recipes_cooked(household_id: str, user_id: str, thread_id: str, recipe_name: str, recipe_external_id: str = "") -> str:
    """Record that a recipe was cooked. Creates a recipes_cooked entry and logs an interaction event."""
    result = await q.create_recipes_cooked(household_id, user_id, recipe_name, thread_id, recipe_external_id or None)
    return f"Recorded: '{recipe_name}' cooked."


TOOLS = [
    get_inventory_snapshot,
    deplete_item,
    add_inventory_items,
    log_rescue_event,
    log_interaction_event,
    create_recipes_cooked,
]
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
        "current_mode": "cook_confirm",
        "message_type": "text_bubble",
        "quick_replies": [],
        "iteration_count": state.get("iteration_count", 0) + 1,
    }
