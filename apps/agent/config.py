import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str
    claude_model: str = "claude-sonnet-4-6"
    claude_haiku_model: str = "claude-haiku-4-5-20251001"
    langchain_tracing_v2: str = "true"
    langchain_api_key: str
    langchain_project: str = "foodstoraii-tina-prod"
    langchain_endpoint: str = "https://api.smith.langchain.com"
    supabase_url: str
    supabase_service_role_key: str
    supabase_db_url: str
    redis_url: str                        # Railway Redis — auto-injected
    internal_secret: str
    environment: str = "production"
    max_thread_messages: int = 20
    context_cache_ttl_seconds: int = 300
    session_cache_ttl_seconds: int = 3600

    class Config:
        env_file = ".env"

settings = Settings()

# Wire LangSmith on import — traces every LLM call automatically
os.environ["LANGCHAIN_TRACING_V2"] = settings.langchain_tracing_v2
os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project
os.environ["LANGCHAIN_ENDPOINT"] = settings.langchain_endpoint
