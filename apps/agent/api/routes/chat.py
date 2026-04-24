from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from agent.graph import get_graph
from context.builder import build_context
from session.manager import load_thread, add_message
from skills.registry import STATE_ALLOWED_TOOLS
from api.middleware import get_current_user

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    thread_id: str
    household_id: str


@router.post("/stream")
async def chat_stream(request: ChatRequest, user=Depends(get_current_user)):
    if not user.get("household_id"):
        raise HTTPException(status_code=400, detail="No household linked to this account")

    thread_state = await load_thread(request.thread_id, request.household_id, user["id"])
    await add_message(request.thread_id, "human", request.message)

    current_mode = thread_state.get("current_mode", "idle")
    allowed_tools = STATE_ALLOWED_TOOLS.get(current_mode, [])
    system_prompt = await build_context(
        household_id=request.household_id,
        user_id=user["id"],
        mode=current_mode,
        thread_id=request.thread_id,
        allowed_tools=allowed_tools,
    )

    graph_input = {
        "messages": thread_state.get("messages", []) + [{"role": "human", "content": request.message}],
        "household_id": request.household_id,
        "user_id": user["id"],
        "thread_id": request.thread_id,
        "current_mode": current_mode,
        "context_snapshot": system_prompt,
        "iteration_count": 0,
        "pending_tool_results": [],
        "quick_replies": [],
        "message_type": "text_bubble",
        "error": None,
        "intent": "",
    }

    config = {"configurable": {"thread_id": request.thread_id}}

    async def generate():
        full_response = ""
        quick_replies = []
        message_type = "text_bubble"

        try:
            async for event in get_graph().astream_events(graph_input, config=config, version="v2"):
                etype = event["event"]

                if etype == "on_chat_model_stream":
                    chunk = event["data"].get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        full_response += chunk.content
                        yield f"data: {json.dumps({'type': 'token', 'content': chunk.content})}\n\n"

                elif etype == "on_tool_start":
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': event.get('name', '')})}\n\n"

                elif etype == "on_tool_end":
                    yield f"data: {json.dumps({'type': 'tool_end', 'tool': event.get('name', '')})}\n\n"

                elif etype == "on_chain_end":
                    final = event["data"].get("output", {})
                    if isinstance(final, dict):
                        message_type = final.get("message_type", "text_bubble")
                        quick_replies = final.get("quick_replies", [])

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': 'Something went wrong. Please try again.'})}\n\n"

        yield f"data: {json.dumps({'type': 'done', 'message_type': message_type, 'quick_replies': quick_replies})}\n\n"

        if full_response:
            await add_message(request.thread_id, "assistant", full_response, message_type=message_type)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
