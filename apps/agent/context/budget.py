"""
Token budget enforcement for context assembly.
Hard limit: 32000 characters (~8000 tokens).
When over limit, kitchen_state block is dropped first (largest block).
"""

HARD_CHAR_LIMIT = 32_000


def enforce_budget(blocks: list[str]) -> list[str]:
    """
    Given an ordered list of context blocks, remove blocks starting from index 3
    (kitchen_state) until the total is within budget.
    Returns the pruned list.
    """
    assembled = "\n\n".join(b for b in blocks if b)
    if len(assembled) <= HARD_CHAR_LIMIT:
        return blocks

    # Drop kitchen_state (index 3) first
    pruned = blocks.copy()
    if len(pruned) > 3:
        pruned[3] = ""

    assembled = "\n\n".join(b for b in pruned if b)
    if len(assembled) <= HARD_CHAR_LIMIT:
        return pruned

    # If still over, drop behaviour signals (index 6)
    if len(pruned) > 6:
        pruned[6] = ""

    return pruned
