from typing import TypedDict, Annotated, Literal
from langgraph.graph.message import add_messages

ConversationMode = Literal[
    "idle", "profiling", "inventory", "recipe",
    "shopping", "meal_plan", "cook_confirm", "proactive"
]

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    household_id: str
    user_id: str
    thread_id: str
    current_mode: ConversationMode
    intent: str
    context_snapshot: str
    iteration_count: int
    pending_tool_results: list
    quick_replies: list[str]
    message_type: str
    error: str | None
