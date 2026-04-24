import asyncio
from context.modules import (
    build_identity_block, build_persona_block, build_dietary_block,
    build_kitchen_state_block, build_household_block, build_memory_block,
    build_behaviour_block, build_mode_block, build_tool_block,
)
from context.budget import enforce_budget
from session.cache import get_cached_context, set_cached_context
from db.queries import (
    get_household_profile, get_inventory_snapshot, get_household_members,
    get_thread_summary, get_recent_cooks, get_behaviour_signals, get_dietary_preferences,
)

KITCHEN_STATE_MODES = {"recipe", "inventory", "cook_confirm", "idle", "general_food"}


async def build_context(household_id: str, user_id: str, mode: str, thread_id: str, allowed_tools: list) -> str:
    cache_key = f"context:{household_id}:{mode}"
    cached = await get_cached_context(cache_key)
    if cached:
        return cached

    results = await asyncio.gather(
        get_household_profile(household_id),
        get_inventory_snapshot(household_id),
        get_household_members(household_id),
        get_thread_summary(thread_id) if thread_id else asyncio.sleep(0),
        get_recent_cooks(household_id, limit=5),
        get_behaviour_signals(household_id, days=30),
        get_dietary_preferences(household_id),
        return_exceptions=True,
    )

    profile = results[0] if not isinstance(results[0], Exception) else {}
    inventory = results[1] if not isinstance(results[1], Exception) else {}
    members = results[2] if not isinstance(results[2], Exception) else []
    summary = results[3] if not isinstance(results[3], Exception) else None
    recent_cooks = results[4] if not isinstance(results[4], Exception) else []
    signals = results[5] if not isinstance(results[5], Exception) else []
    dietary = results[6] if not isinstance(results[6], Exception) else []

    # Operational header — lets the LLM pass household_id to tools
    operational = (
        f"## OPERATIONAL CONTEXT\n"
        f"Household ID: {household_id}\n"
        f"User ID: {user_id}\n"
        f"Thread ID: {thread_id}"
    )

    blocks = [
        operational,
        build_identity_block(),
        build_persona_block(profile or {}),
        build_dietary_block(dietary or [], (profile or {}).get("avoid_ingredients", [])),
        build_kitchen_state_block(inventory or {}) if mode in KITCHEN_STATE_MODES else "",
        build_household_block(members or []) if len(members or []) > 1 else "",
        build_memory_block(summary, recent_cooks or []),
        build_behaviour_block(signals or []),
        build_mode_block(mode),
        build_tool_block(allowed_tools),
    ]

    blocks = enforce_budget(blocks)
    assembled = "\n\n".join(b for b in blocks if b)

    await set_cached_context(cache_key, assembled)
    return assembled
