"""
Proactive node — triggered by nudge-dispatch cron via /internal/proactive.
Always: brief, specific, references actual kitchen state.
Always: ends with 2-3 quick reply options.
Constraint: cannot trigger any other FSM state. Routes to END only.
"""
from langchain_core.messages import SystemMessage
from agent.state import AgentState
from agent.llm import llm
from agent.nodes import execute_tool_calls
from skills.inventory_skill import get_inventory_snapshot, log_interaction_event
from skills.nudge_skill import get_expiring_items, schedule_nudge
from skills.recipe_skill import find_recipes_by_inventory

TOOLS = [
    get_inventory_snapshot,
    get_expiring_items,
    find_recipes_by_inventory,
    schedule_nudge,
    log_interaction_event,
]
TOOL_MAP = {t.name: t for t in TOOLS}
MODEL = llm.bind_tools(TOOLS)

# Quick reply sets for common proactive nudge types
QUICK_REPLIES = {
    "expiry_warning": ["Show me recipes with it", "I'll use it, thanks", "Throw it out"],
    "daily_meal_nudge": ["Yes, show me recipes", "I already know what I'm making", "Not cooking tonight"],
    "post_dinner": ["Yes, we cooked", "We ordered out", "Not yet, still cooking"],
    "default": ["Show me ideas", "Not now", "Dismiss"],
}


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

    # Determine quick replies based on nudge context
    nudge_type = state.get("intent", "default")
    quick_replies = QUICK_REPLIES.get(nudge_type, QUICK_REPLIES["default"])

    return {
        "messages": [response],
        "current_mode": "proactive",
        "message_type": "nudge_bubble",
        "quick_replies": quick_replies,
        "iteration_count": state.get("iteration_count", 0) + 1,
    }
