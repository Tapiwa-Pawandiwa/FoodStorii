"""
Idle node — entry point for every conversation turn.
Classifies intent, handles terminal intents directly, passes state for specialized nodes.
"""
from langchain_core.messages import SystemMessage, AIMessage
from agent.state import AgentState
from agent.intent_classifier import classify_intent, is_obviously_off_topic
from agent.llm import llm

REFUSAL = "I'm Tina — I can only help with food and kitchen questions. What can I help you cook today?"

# Intents that idle handles directly (no specialized node)
TERMINAL_INTENTS = {"off_topic", "general_food", "waste_query"}


async def node(state: AgentState) -> dict:
    messages = state["messages"]
    last_user = next((m.content for m in reversed(messages) if m.type == "human"), "")

    # Fast path: heuristic off-topic check before LLM
    if is_obviously_off_topic(last_user):
        return {
            "messages": [AIMessage(content=REFUSAL)],
            "intent": "off_topic",
            "message_type": "text_bubble",
            "quick_replies": [],
        }

    # Classify intent with Haiku (cheap, fast)
    intent = await classify_intent(state)

    if intent == "off_topic":
        return {
            "messages": [AIMessage(content=REFUSAL)],
            "intent": "off_topic",
            "message_type": "text_bubble",
            "quick_replies": [],
        }

    # For terminal intents, generate a response here using the main LLM
    if intent in TERMINAL_INTENTS:
        system = SystemMessage(content=state.get("context_snapshot", ""))
        response = await llm.ainvoke([system] + list(messages))
        return {
            "messages": [response],
            "intent": intent,
            "message_type": "text_bubble",
            "quick_replies": [],
        }

    # For specialized intents, just store the classified intent.
    # The edge router will dispatch to the correct specialized node.
    return {"intent": intent}
