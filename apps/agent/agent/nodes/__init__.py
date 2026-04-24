"""
Node helper: shared tool execution pattern used by all agent nodes.
"""
from langchain_core.messages import ToolMessage


async def execute_tool_calls(last_message, tool_map: dict) -> list[ToolMessage]:
    """
    Execute all tool_calls in the last AI message.
    Returns a list of ToolMessage results to append to state.
    """
    results = []
    for tc in last_message.tool_calls:
        tool = tool_map.get(tc["name"])
        if tool is None:
            content = f"Tool '{tc['name']}' is not available in this mode."
        else:
            try:
                content = await tool.ainvoke(tc["args"])
            except Exception as e:
                content = f"Tool error: {e}"
        results.append(ToolMessage(
            content=str(content),
            tool_call_id=tc["id"],
            name=tc["name"],
        ))
    return results
