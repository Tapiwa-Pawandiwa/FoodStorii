"""
Profiling node — deepens household profile conversationally.
Asks ONE question at a time. Saves each answer before asking the next.
Marks onboarding complete when enough context is captured.
"""
from langchain_core.messages import SystemMessage
from agent.state import AgentState
from agent.llm import llm
from agent.nodes import execute_tool_calls
from skills.household_skill import get_household_profile, update_household_profile
from skills.memory_skill import log_interaction_event

TOOLS = [get_household_profile, update_household_profile, log_interaction_event]
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
        "current_mode": "profiling",
        "message_type": "text_bubble",
        "quick_replies": [],
        "iteration_count": state.get("iteration_count", 0) + 1,
    }
