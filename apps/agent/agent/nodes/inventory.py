"""
Inventory node — manages kitchen inventory with precise quantity tier tracking.
Every state change writes an inventory_event. Confidence levels are always set.
"""
from langchain_core.messages import SystemMessage
from agent.state import AgentState
from agent.llm import llm
from agent.nodes import execute_tool_calls
from skills.inventory_skill import (
    get_inventory_snapshot, add_inventory_items, update_quantity_tier,
    deplete_item, log_interaction_event, reconcile_extraction_items,
)

TOOLS = [
    get_inventory_snapshot, add_inventory_items, update_quantity_tier,
    deplete_item, log_interaction_event, reconcile_extraction_items,
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
        "current_mode": "inventory",
        "message_type": "text_bubble",
        "quick_replies": [],
        "iteration_count": state.get("iteration_count", 0) + 1,
    }
