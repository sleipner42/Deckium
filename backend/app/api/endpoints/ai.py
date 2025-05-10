from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.models.ai import ChatRequest, ChatResponse
from app.core.ai_service import ai_service
from app.api.deps import get_current_authenticated_user
from app.core.auth import TokenData

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest, 
    current_user: TokenData = Depends(get_current_authenticated_user)
):
    try:
        if request.stream:
            raise HTTPException(
                status_code=400, 
                detail="Use /chat/stream endpoint for streaming responses"
            )
            
        response = await ai_service.chat(
            messages=request.messages
        )
        
        return ChatResponse(content=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: TokenData = Depends(get_current_authenticated_user)
):
    try:
        if not request.stream:
            raise HTTPException(
                status_code=400, 
                detail="Stream parameter must be set to true"
            )
            
        async def generate():
            async for chunk in ai_service.chat_stream(
                messages=request.messages
            ):
                yield chunk
                
        return StreamingResponse(
            generate(), 
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream",
                "Access-Control-Allow-Origin": "*"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 