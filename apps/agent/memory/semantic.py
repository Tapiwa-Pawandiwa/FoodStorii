"""
Tier 3 semantic memory — pgvector similarity retrieval.
Used when working and episodic memory don't contain what's needed.
Retrieval is via HNSW cosine similarity on embeddings_index table.
NOTE: Embedding generation (OpenAI or local) is not yet wired — placeholder only.
"""
from db.supabase import get_supabase


async def search_semantic_memory(household_id: str, query_embedding: list[float], limit: int = 5) -> list[dict]:
    """
    Retrieve semantically similar memories for a household.
    query_embedding: 1536-dim float vector (must match embeddings_index column dimension).
    """
    db = get_supabase()
    # pgvector cosine distance query
    res = await db.rpc("match_embeddings", {
        "p_household_id": household_id,
        "p_query_embedding": query_embedding,
        "p_limit": limit,
    }).execute()
    return res.data or []
