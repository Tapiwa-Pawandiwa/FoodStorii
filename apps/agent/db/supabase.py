from supabase import AsyncClient, create_async_client
from config import settings

_client: AsyncClient | None = None

async def init_supabase():
    global _client
    _client = await create_async_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )

def get_supabase() -> AsyncClient:
    if _client is None:
        raise RuntimeError("Supabase client not initialized. Call init_supabase() at startup.")
    return _client
