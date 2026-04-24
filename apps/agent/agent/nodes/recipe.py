"""
Recipe node — suggests recipes based on kitchen inventory.
Ranking: expiring items first → dietary safe → goal aligned → not recent → fewest missing.
"""
from langchain_core.messages import SystemMessage
from agent.state import AgentState
from agent.llm import llm
from agent.nodes import execute_tool_calls
from skills.recipe_skill import find_recipes_by_inventory, get_recipe_detail, save_recipe, get_inventory_snapshot_for_recipe
from skills.inventory_skill import log_interaction_event

TOOLS = [
    find_recipes_by_inventory,
    get_recipe_detail,
    save_recipe,
    get_inventory_snapshot_for_recipe,
    log_interaction_event,
]
TOOL_MAP = {t.name: t for t in TOOLS}
MODEL = llm.bind_tools(TOOLS)


async def node(state: AgentState) -> dict:
    messages = state["messages"]
    last = messages[-1] if messages else None

    # Execute pending tool calls from previous iteration
    if last and hasattr(last, "tool_calls") and last.tool_calls:
        tool_msgs = await execute_tool_calls(last, TOOL_MAP)
        return {
            "messages": tool_msgs,
            "iteration_count": state.get("iteration_count", 0) + 1,
        }

    # Call the LLM with recipe tools bound
    system = SystemMessage(content=state.get("context_snapshot", ""))
    response = await MODEL.ainvoke([system] + list(messages))

    return {
        "messages": [response],
        "current_mode": "recipe",
        "message_type": "text_bubble",
        "quick_replies": [],
        "iteration_count": state.get("iteration_count", 0) + 1,
    }
