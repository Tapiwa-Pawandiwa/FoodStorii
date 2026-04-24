"""
Internal proactive route — triggered by nudge-dispatch cron job.
Protected by INTERNAL_SECRET (set via AuthMiddleware on /internal/* paths).
Runs the proactive node for a specific household.
"""
import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agent.graph import get_graph
from context.builder import build_context
from skills.registry import STATE_ALLOWED_TOOLS

log = structlog.get_logger()
router = APIRouter()


class ProactiveRequest(BaseModel):
    household_id: str
    nudge_type: str      # daily_meal_nudge | expiry_warning | post_dinner | weekly_summary
    thread_id: str | None = None


@router.post("/proactive")
async def trigger_proactive(request: ProactiveRequest):
    """
    Called by nudge-dispatch to generate a proactive Tina message for a household.
    The generated message is stored in nudge_candidates for the dispatch cron to deliver.
    """
    try:
        allowed_tools = STATE_ALLOWED_TOOLS.get("proactive", [])
        system_prompt = await build_context(
            household_id=request.household_id,
            user_id="system",
            mode="proactive",
            thread_id=request.thread_id or "",
            allowed_tools=allowed_tools,
        )

        graph_input = {
            "messages": [{"role": "human", "content": f"Generate a {request.nudge_type} nudge for this household."}],
            "household_id": request.household_id,
            "user_id": "system",
            "thread_id": request.thread_id or "proactive",
            "current_mode": "proactive",
            "context_snapshot": system_prompt,
            "iteration_count": 0,
            "pending_tool_results": [],
            "quick_replies": [],
            "message_type": "nudge_bubble",
            "error": None,
            "intent": request.nudge_type,
        }

        config = {"configurable": {"thread_id": f"proactive-{request.household_id}"}}
        result = await get_graph().ainvoke(graph_input, config=config)

        messages = result.get("messages", [])
        last = messages[-1] if messages else None
        content = last.content if last and hasattr(last, "content") else ""

        log.info("proactive_generated", household_id=request.household_id, nudge_type=request.nudge_type)
        return {"success": True, "content": content, "quick_replies": result.get("quick_replies", [])}

    except Exception as e:
        log.error("proactive_failed", household_id=request.household_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
