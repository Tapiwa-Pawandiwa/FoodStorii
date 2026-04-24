from agent.state import AgentState
from agent.intent_classifier import classify_intent

# EXPLICIT ALLOWED TRANSITIONS — everything else is blocked
ALLOWED_TRANSITIONS = {
    "idle":         {"profiling", "inventory", "recipe", "shopping", "meal_plan", "__end__"},
    "profiling":    {"__end__"},
    "inventory":    {"__end__"},
    "recipe":       {"cook_confirm", "__end__"},
    "shopping":     {"__end__"},
    "meal_plan":    {"__end__"},
    "cook_confirm": {"inventory"},        # always goes to inventory after depletion
    "proactive":    {"__end__"},          # proactive cannot trigger any other state
}

# EXPLICIT BLOCKED TRANSITIONS — enforced at code level
BLOCKED_TRANSITIONS = {
    "cook_confirm": {"recipe", "shopping", "meal_plan", "profiling", "proactive"},
    "proactive":    {"cook_confirm", "inventory", "recipe", "shopping", "meal_plan"},
}

INTENT_TO_MODE = {
    "recipe_request":   "recipe",
    "use_expiring":     "recipe",
    "inventory_update": "inventory",
    "item_scan":        "inventory",
    "inventory_query":  "inventory",
    "shopping_list":    "shopping",
    "missing_items":    "shopping",
    "cook_this":        "recipe",
    "mark_cooked":      "recipe",
    "ate_out":          "inventory",
    "threw_out":        "inventory",
    "meal_plan":        "meal_plan",
    "profile_update":   "profiling",
    "waste_query":      "__end__",
    "general_food":     "__end__",
}


async def route_from_idle(state: AgentState) -> str:
    # Use intent already classified and stored by idle.node to avoid double LLM call
    intent = state.get("intent") or await classify_intent(state)

    if intent == "off_topic":
        return "__end__"

    if intent == "profile_update":
        if "onboarding_status: completed" in state.get("context_snapshot", ""):
            return "__end__"

    mode = INTENT_TO_MODE.get(intent, "__end__")
    allowed = ALLOWED_TRANSITIONS.get("idle", set())
    return mode if mode in allowed else "__end__"


def should_continue(state: AgentState) -> str:
    messages = state["messages"]
    last = messages[-1] if messages else None
    if last and hasattr(last, "tool_calls") and last.tool_calls:
        if state.get("iteration_count", 0) >= 5:
            state["error"] = "I ran into a problem. Can you try again?"
            return "__end__"
        return "continue"
    return "__end__"
