from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from agent.state import AgentState
from agent.nodes import idle, profiling, inventory, recipe, shopping, meal_plan, cook_confirm, proactive
from agent.edges import route_from_idle, should_continue

# NOTE: llm is defined in agent/llm.py to avoid circular imports.
# graph.py re-exports it so existing imports from agent.graph still work.
from agent.llm import llm  # noqa: F401

# Lazy-initialised — set during startup via init_graph(), not at import time.
graph = None


def build_graph():
    builder = StateGraph(AgentState)

    builder.add_node("idle", idle.node)
    builder.add_node("profiling", profiling.node)
    builder.add_node("inventory", inventory.node)
    builder.add_node("recipe", recipe.node)
    builder.add_node("shopping", shopping.node)
    builder.add_node("meal_plan", meal_plan.node)
    builder.add_node("cook_confirm", cook_confirm.node)
    builder.add_node("proactive", proactive.node)

    builder.set_entry_point("idle")

    builder.add_conditional_edges("idle", route_from_idle, {
        "profiling":  "profiling",
        "inventory":  "inventory",
        "recipe":     "recipe",
        "shopping":   "shopping",
        "meal_plan":  "meal_plan",
        "proactive":  "proactive",
        "__end__":    END,
    })

    for node_name in ["profiling", "inventory", "recipe", "shopping", "meal_plan"]:
        builder.add_conditional_edges(node_name, should_continue, {
            "continue": node_name,
            "__end__":  END,
        })

    builder.add_edge("cook_confirm", "inventory")
    builder.add_edge("proactive", END)

    return builder


def init_graph():
    """
    Called during FastAPI startup.
    Using MemorySaver for now — conversations persist per-process only.
    Replace with AsyncPostgresSaver once the service is stable.
    """
    global graph
    checkpointer = MemorySaver()
    workflow = build_graph()
    graph = workflow.compile(checkpointer=checkpointer)


def get_graph():
    """Return the compiled graph. Always call this rather than importing `graph` directly."""
    return graph
