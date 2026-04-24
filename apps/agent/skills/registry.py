"""
Skill registry — defines which tools are allowed in each FSM state.
Enforced at BOTH prompt level (tool_block in context) AND code level (node binding).
"""

STATE_ALLOWED_TOOLS: dict[str, list[str]] = {
    "idle":         [],
    "profiling":    ["get_household_profile", "update_household_profile", "log_interaction_event"],
    "inventory":    ["get_inventory_snapshot", "add_inventory_items", "update_quantity_tier",
                     "deplete_item", "log_interaction_event", "reconcile_extraction_items"],
    "recipe":       ["get_inventory_snapshot", "find_recipes_by_inventory",
                     "get_recipe_detail", "save_recipe", "log_interaction_event"],
    "shopping":     ["get_shopping_list", "create_shopping_list", "add_to_shopping_list",
                     "get_missing_ingredients", "log_interaction_event"],
    "meal_plan":    ["get_meal_plan", "add_to_meal_plan", "get_missing_ingredients",
                     "add_to_shopping_list", "log_interaction_event"],
    "cook_confirm": ["get_inventory_snapshot", "deplete_item", "add_inventory_items",
                     "log_rescue_event", "log_interaction_event", "create_recipes_cooked"],
    "proactive":    ["get_inventory_snapshot", "get_expiring_items",
                     "find_recipes_by_inventory", "schedule_nudge", "log_interaction_event"],
}
