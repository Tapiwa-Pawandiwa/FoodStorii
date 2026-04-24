"""
Shopping node — manages the shopping list.
IMPORTANT: checking items off shopping list does NOT update inventory.
Only barcode/receipt scan updates inventory.
"""
from langchain_core.messages import SystemMessage
from agent.state import AgentState
from agent.llm import llm
from agent.nodes import execute_tool_calls
from skills.shopping_skill import get_shopping_list, create_shopping_list, add_to_shopping_list, get_missing_ingredients
from skills.memory_skill import log_interaction_event

TOOLS = [get_shopping_list, create_shopping_list, add_to_shopping_list, get_missing_ingredients, log_interaction_event]
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
        "current_mode": "shopping",
        "message_type": "text_bubble",
        "quick_replies": [],
        "iteration_count": state.get("iteration_count", 0) + 1,
    }
