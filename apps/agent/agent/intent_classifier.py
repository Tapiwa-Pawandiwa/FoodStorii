import json
from langchain_anthropic import ChatAnthropic
from agent.state import AgentState
from config import settings

classifier_llm = ChatAnthropic(
    model=settings.claude_haiku_model,
    api_key=settings.anthropic_api_key,
    max_tokens=100,
    temperature=0,
)

INTENT_TAXONOMY = [
    "recipe_request", "use_expiring", "inventory_update", "item_scan",
    "inventory_query", "shopping_list", "missing_items", "cook_this",
    "mark_cooked", "ate_out", "threw_out", "meal_plan", "profile_update",
    "waste_query", "general_food", "off_topic"
]

CLASSIFIER_PROMPT = f"""Classify the user message into exactly one intent from this list:
{", ".join(INTENT_TAXONOMY)}
Return ONLY valid JSON: {{"intent": "<intent>", "confidence": <0.0-1.0>}}
No other text."""

OFF_TOPIC_KEYWORDS = [
    "capital of", "stock price", "bitcoin", "crypto", "weather", "politics",
    "election", "homework", "essay", "cover letter", "football", "sports score",
    "celebrity", "movie review", "music", "coding", "programming"
]


def is_obviously_off_topic(message: str) -> bool:
    """Heuristic check before LLM call — avoids spending tokens on clear off-topic messages."""
    msg_lower = message.lower()
    return any(kw in msg_lower for kw in OFF_TOPIC_KEYWORDS)


async def classify_intent(state: AgentState) -> str:
    messages = state["messages"]
    last_user = next((m.content for m in reversed(messages) if m.type == "human"), "")
    current_mode = state.get("current_mode", "idle")

    if is_obviously_off_topic(last_user):
        return "off_topic"

    try:
        response = await classifier_llm.ainvoke([
            {"role": "system", "content": CLASSIFIER_PROMPT},
            {"role": "user", "content": f"Mode: {current_mode}\nMessage: {last_user}"}
        ])
        return json.loads(response.content).get("intent", "general_food")
    except Exception:
        return "general_food"
