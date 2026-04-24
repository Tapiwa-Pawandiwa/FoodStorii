"""
Shared LLM instances. Import from here to avoid circular dependencies.
graph.py and all node files import llm from this module.
"""
from langchain_anthropic import ChatAnthropic
from config import settings

llm = ChatAnthropic(
    model=settings.claude_model,
    api_key=settings.anthropic_api_key,
    max_tokens=4096,
    temperature=0,
    streaming=True,
)
