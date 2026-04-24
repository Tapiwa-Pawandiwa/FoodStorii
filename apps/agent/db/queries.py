"""
All parameterised Supabase query functions.
Every DB call in the agent service goes through this module.
No raw SQL outside of this file. No business logic here — only data access.
"""
from datetime import datetime, timedelta, timezone
from db.supabase import get_supabase


# ── Household Profile ─────────────────────────────────────────────────────────

async def get_household_profile(household_id: str) -> dict | None:
    db = get_supabase()
    res = await db.table("household_profiles").select("*").eq("household_id", household_id).single().execute()
    return res.data if res.data else None


async def update_household_profile(household_id: str, updates: dict) -> dict:
    db = get_supabase()
    updates["household_id"] = household_id
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.table("household_profiles").upsert(updates, on_conflict="household_id").select().single().execute()
    return res.data


async def get_dietary_preferences(household_id: str) -> list[str]:
    profile = await get_household_profile(household_id)
    if not profile:
        return []
    return profile.get("dietary_preferences") or []


# ── Household Members ─────────────────────────────────────────────────────────

async def get_household_members(household_id: str) -> list[dict]:
    db = get_supabase()
    res = await db.table("household_members").select("*, users(id, display_name)").eq("household_id", household_id).execute()
    rows = res.data or []
    return [
        {
            "name": r.get("users", {}).get("display_name", "Member") if r.get("users") else "Member",
            "role": r.get("role", "viewer"),
            "primary_driver": r.get("primary_driver"),
            "dietary_preferences": r.get("dietary_preferences") or [],
            "is_shopper": r.get("is_shopper", False),
        }
        for r in rows
    ]


# ── Inventory ─────────────────────────────────────────────────────────────────

async def get_inventory_snapshot(household_id: str) -> dict:
    """Returns inventory grouped by storage_location for context builder."""
    db = get_supabase()
    res = await db.table("inventory_items").select(
        "id, name, category, storage_location, quantity_tier, countable_quantity, "
        "expiry_estimate, confidence, status"
    ).eq("household_id", household_id).eq("status", "available").execute()

    items = res.data or []
    now = datetime.now(timezone.utc)
    grouped: dict[str, list] = {"fridge": [], "pantry": [], "freezer": []}

    for item in items:
        location = (item.get("storage_location") or "pantry").lower()
        expiry = item.get("expiry_estimate")
        days_until = None
        if expiry:
            try:
                exp_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
                days_until = (exp_dt - now).days
            except Exception:
                pass
        grouped.setdefault(location, []).append({
            "id": item["id"],
            "name": item["name"],
            "quantity_tier": item.get("quantity_tier", "mostly_full"),
            "countable_quantity": item.get("countable_quantity"),
            "days_until_expiry": days_until,
            "confidence": item.get("confidence"),
        })

    return grouped


async def get_inventory_snapshot_raw(household_id: str) -> list[dict]:
    """Returns flat list of all available inventory items."""
    db = get_supabase()
    res = await db.table("inventory_items").select("*").eq("household_id", household_id).eq("status", "available").order("created_at", desc=True).execute()
    return res.data or []


async def get_expiring_items(household_id: str, days: int = 3) -> list[dict]:
    db = get_supabase()
    cutoff = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    res = await db.table("inventory_items").select("id, name, expiry_estimate, quantity_tier, storage_location").eq("household_id", household_id).eq("status", "available").lte("expiry_estimate", cutoff).execute()
    return res.data or []


async def add_inventory_items(household_id: str, user_id: str, items: list[dict]) -> list[dict]:
    db = get_supabase()
    rows = [
        {
            "household_id": household_id,
            "name": i["name"],
            "category": i.get("category"),
            "storage_location": i.get("storage_location", "pantry"),
            "quantity_tier": i.get("quantity_tier", "mostly_full"),
            "countable_quantity": i.get("countable_quantity"),
            "unit": i.get("unit"),
            "expiry_estimate": i.get("expiry_estimate"),
            "confidence": i.get("confidence", "user_stated_preference"),
            "status": "available",
            "source_type": i.get("source_type", "manual"),
        }
        for i in items
    ]
    res = await db.table("inventory_items").insert(rows).select().execute()
    await log_interaction_event(household_id, user_id, "inventory_add", {"count": len(rows)})
    return res.data or []


async def update_quantity_tier(item_id: str, tier: str, household_id: str, user_id: str) -> None:
    db = get_supabase()
    await db.table("inventory_items").update({"quantity_tier": tier, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", item_id).eq("household_id", household_id).execute()
    await log_interaction_event(household_id, user_id, "inventory_quantity_update", {"item_id": item_id, "tier": tier})


async def deplete_item(item_id: str, household_id: str, user_id: str) -> str:
    db = get_supabase()
    await db.table("inventory_items").update({"status": "consumed", "quantity_tier": "finished", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", item_id).eq("household_id", household_id).execute()
    await log_interaction_event(household_id, user_id, "inventory_deplete", {"item_id": item_id})
    return "depleted"


async def reconcile_extraction_items(household_id: str, user_id: str, items: list[dict]) -> list[dict]:
    """Upsert extracted items: update existing by name match, insert new ones."""
    db = get_supabase()
    existing_res = await db.table("inventory_items").select("id, name").eq("household_id", household_id).eq("status", "available").execute()
    existing = {r["name"].lower(): r["id"] for r in (existing_res.data or [])}

    updated, inserted = [], []
    for item in items:
        name_lower = item["name"].lower()
        if name_lower in existing:
            await db.table("inventory_items").update({
                "quantity_tier": item.get("quantity_tier", "mostly_full"),
                "expiry_estimate": item.get("expiry_estimate"),
                "confidence": item.get("confidence", "inferred_high_confidence"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", existing[name_lower]).execute()
            updated.append({"name": item["name"], "action": "updated"})
        else:
            rows = [{
                "household_id": household_id,
                "name": item["name"],
                "category": item.get("category"),
                "storage_location": item.get("storage_location", "pantry"),
                "quantity_tier": item.get("quantity_tier", "mostly_full"),
                "expiry_estimate": item.get("expiry_estimate"),
                "confidence": item.get("confidence", "inferred_high_confidence"),
                "status": "available",
                "source_type": "manual",
            }]
            await db.table("inventory_items").insert(rows).execute()
            inserted.append({"name": item["name"], "action": "inserted"})

    await log_interaction_event(household_id, user_id, "inventory_reconcile", {"updated": len(updated), "inserted": len(inserted)})
    return updated + inserted


# ── Recipes ───────────────────────────────────────────────────────────────────

async def find_recipes_by_inventory(household_id: str, max_missing: int = 3, limit: int = 5) -> list[dict]:
    """Score external_recipes_cache against current inventory. Returns ranked list."""
    db = get_supabase()
    inventory = await get_inventory_snapshot_raw(household_id)
    available_names = {i["name"].lower() for i in inventory}

    res = await db.table("external_recipes_cache").select(
        "id, external_id, title, image_url, ready_in_minutes, servings, diets, ingredients_json"
    ).execute()
    recipes = res.data or []

    scored = []
    for r in recipes:
        ingredients = r.get("ingredients_json") or []
        if not ingredients:
            continue
        ingredient_names = [ing.get("name", "").lower() for ing in ingredients if isinstance(ing, dict)]
        have = sum(1 for n in ingredient_names if any(n in avail or avail in n for avail in available_names))
        missing = len(ingredient_names) - have
        if missing > max_missing:
            continue
        scored.append({
            "external_id": r["external_id"],
            "title": r["title"],
            "image_url": r.get("image_url"),
            "ready_in_minutes": r.get("ready_in_minutes"),
            "missing_count": missing,
            "match_score": round(have / len(ingredient_names) * 100) if ingredient_names else 0,
            "missing_ingredients": [n for n in ingredient_names if not any(n in avail or avail in n for avail in available_names)],
        })

    scored.sort(key=lambda x: (x["missing_count"], -x["match_score"]))
    return scored[:limit]


async def get_recipe_detail(external_id: str) -> dict | None:
    db = get_supabase()
    res = await db.table("external_recipes_cache").select("*").eq("external_id", external_id).single().execute()
    return res.data if res.data else None


async def save_recipe(recipe_data: dict) -> dict:
    """Upsert recipe into external_recipes_cache."""
    db = get_supabase()
    recipe_data.setdefault("source", "manual")
    recipe_data.setdefault("fetched_at", datetime.now(timezone.utc).isoformat())
    recipe_data.setdefault("expires_at", (datetime.now(timezone.utc) + timedelta(days=7)).isoformat())
    res = await db.table("external_recipes_cache").upsert(recipe_data, on_conflict="source,external_id").select().single().execute()
    return res.data


async def get_missing_ingredients(household_id: str, external_id: str) -> list[str]:
    recipe = await get_recipe_detail(external_id)
    if not recipe:
        return []
    inventory = await get_inventory_snapshot_raw(household_id)
    available_names = {i["name"].lower() for i in inventory}
    ingredients = recipe.get("ingredients_json") or []
    return [
        ing.get("name", "")
        for ing in ingredients
        if isinstance(ing, dict) and not any(
            ing.get("name", "").lower() in avail or avail in ing.get("name", "").lower()
            for avail in available_names
        )
    ]


async def create_recipes_cooked(household_id: str, user_id: str, recipe_name: str, thread_id: str, recipe_external_id: str | None = None) -> dict:
    db = get_supabase()
    row = {
        "household_id": household_id,
        "user_id": user_id,
        "thread_id": thread_id,
        "recipe_name": recipe_name,
        "recipe_external_id": recipe_external_id,
        "recipe_source": "external_cache" if recipe_external_id else "manual",
        "cooked_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.table("recipes_cooked").insert(row).select().single().execute()
    await log_interaction_event(household_id, user_id, "cook_confirmed", {"recipe_name": recipe_name})
    return res.data


async def get_recent_cooks(household_id: str, limit: int = 5) -> list[str]:
    db = get_supabase()
    res = await db.table("recipes_cooked").select("recipe_name").eq("household_id", household_id).order("cooked_at", desc=True).limit(limit).execute()
    return [r["recipe_name"] for r in (res.data or [])]


# ── Shopping ──────────────────────────────────────────────────────────────────

async def get_shopping_list(household_id: str) -> dict | None:
    db = get_supabase()
    res = await db.table("shopping_lists").select("*, shopping_list_items(*)").eq("household_id", household_id).in_("status", ["draft", "active"]).order("created_at", desc=True).limit(1).single().execute()
    return res.data if res.data else None


async def create_shopping_list(household_id: str, user_id: str) -> dict:
    db = get_supabase()
    row = {"household_id": household_id, "created_by": user_id, "status": "active"}
    res = await db.table("shopping_lists").insert(row).select().single().execute()
    return res.data


async def add_to_shopping_list(list_id: str, items: list[dict]) -> None:
    db = get_supabase()
    rows = [{"list_id": list_id, "name": i["name"], "quantity": i.get("quantity"), "unit": i.get("unit"), "category": i.get("category"), "status": "pending"} for i in items]
    await db.table("shopping_list_items").insert(rows).execute()


# ── Meal Plan ─────────────────────────────────────────────────────────────────

async def get_meal_plan(household_id: str) -> list[dict]:
    db = get_supabase()
    today = datetime.now(timezone.utc).date().isoformat()
    week_end = (datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat()
    res = await db.table("meal_plans").select("*").eq("household_id", household_id).gte("slot_date", today).lte("slot_date", week_end).order("slot_date").execute()
    return res.data or []


async def add_to_meal_plan(household_id: str, user_id: str, recipe_name: str, slot_date: str, meal_type: str = "dinner", recipe_external_id: str | None = None) -> dict:
    db = get_supabase()
    row = {
        "household_id": household_id,
        "created_by": user_id,
        "recipe_name": recipe_name,
        "recipe_external_id": recipe_external_id,
        "slot_date": slot_date,
        "meal_type": meal_type,
        "status": "planned",
    }
    res = await db.table("meal_plans").insert(row).select().single().execute()
    await log_interaction_event(household_id, user_id, "meal_planned", {"recipe_name": recipe_name, "slot_date": slot_date})
    return res.data


# ── Nudges ────────────────────────────────────────────────────────────────────

async def schedule_nudge(household_id: str, nudge_type: str, title: str, body: str, scheduled_for: str) -> None:
    db = get_supabase()
    await db.table("nudge_candidates").insert({
        "household_id": household_id,
        "nudge_type": nudge_type,
        "title": title,
        "body": body,
        "scheduled_for": scheduled_for,
        "status": "pending",
    }).execute()


# ── Rescue / Waste Events ─────────────────────────────────────────────────────

async def log_rescue_event(household_id: str, user_id: str, item_id: str, recipe_name: str, quantity_tier_at_rescue: str, estimated_saving_eur: float) -> None:
    db = get_supabase()
    await db.table("rescue_events").insert({
        "household_id": household_id,
        "user_id": user_id,
        "item_id": item_id,
        "recipe_name": recipe_name,
        "quantity_tier_at_rescue": quantity_tier_at_rescue,
        "estimated_saving_eur": estimated_saving_eur,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()


# ── Interaction Events (append-only audit log) ────────────────────────────────

async def log_interaction_event(household_id: str, user_id: str, event_type: str, payload: dict | None = None) -> None:
    db = get_supabase()
    try:
        await db.table("interaction_events").insert({
            "household_id": household_id,
            "user_id": user_id,
            "event_type": event_type,
            "payload": payload or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception:
        pass  # never block agent flow on event logging failure


async def get_behaviour_signals(household_id: str, days: int = 30) -> list[dict]:
    db = get_supabase()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    res = await db.table("interaction_events").select("event_type, payload, created_at").eq("household_id", household_id).gte("created_at", since).order("created_at", desc=True).limit(50).execute()
    return [{"signal_type": r["event_type"], "payload": r.get("payload", {})} for r in (res.data or [])]


# ── Thread / Memory ───────────────────────────────────────────────────────────

async def get_thread_by_id(thread_id: str) -> dict | None:
    db = get_supabase()
    res = await db.table("conversation_threads").select("*").eq("id", thread_id).single().execute()
    return res.data if res.data else None


async def create_thread(household_id: str, user_id: str) -> dict:
    db = get_supabase()
    res = await db.table("conversation_threads").insert({
        "household_id": household_id,
        "user_id": user_id,
        "current_mode": "idle",
        "message_count": 0,
        "status": "active",
    }).select().single().execute()
    return res.data


async def update_thread_mode(thread_id: str, mode: str, message_count: int) -> None:
    db = get_supabase()
    await db.table("conversation_threads").update({
        "current_mode": mode,
        "message_count": message_count,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", thread_id).execute()


async def get_thread_messages_from_db(thread_id: str, limit: int = 20) -> list[dict]:
    db = get_supabase()
    res = await db.table("thread_messages").select("role, content, message_type, metadata").eq("thread_id", thread_id).order("created_at").limit(limit).execute()
    return [{"role": r["role"], "content": r["content"]} for r in (res.data or [])]


async def save_thread_message(thread_id: str, role: str, content: str, message_type: str = "text_bubble", metadata: dict | None = None) -> None:
    db = get_supabase()
    await db.table("thread_messages").insert({
        "thread_id": thread_id,
        "role": role,
        "content": content,
        "message_type": message_type,
        "metadata": metadata or {},
    }).execute()


async def save_thread_summary(thread_id: str, household_id: str, summary: str) -> None:
    db = get_supabase()
    await db.table("memory_summaries").insert({
        "thread_id": thread_id,
        "household_id": household_id,
        "summary": summary,
    }).execute()


async def get_thread_summary(thread_id: str) -> str | None:
    db = get_supabase()
    res = await db.table("memory_summaries").select("summary").eq("thread_id", thread_id).order("created_at", desc=True).limit(1).single().execute()
    return res.data["summary"] if res.data else None
