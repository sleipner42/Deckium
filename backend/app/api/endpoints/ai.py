from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.models.ai import ChatRequest, ChatResponse
from app.core.ai_service import ai_service
from app.services.transaction_service import TransactionService
from app.dependencies import get_transaction_service, get_user_repo
from app.repositories.user import UserRepository
from app.api.deps import get_current_authenticated_user
from app.core.auth import TokenData

router = APIRouter()

AI_CHAT_COST = 1.0


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: TokenData = Depends(get_current_authenticated_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
    user_repo: UserRepository = Depends(get_user_repo),
):
    try:
        if not current_user.email:
            raise HTTPException(status_code=401, detail="Unauthorized")

        user = await user_repo.get_by_email(current_user.email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        balance = await transaction_service.get_balance(user.id)
        if balance < AI_CHAT_COST:
            raise HTTPException(
                status_code=402,
                detail=(
                    f"Insufficient credits: {balance} available {AI_CHAT_COST} required"
                ),
            )

        if request.stream:
            raise HTTPException(
                status_code=400,
                detail="Use /chat/stream endpoint for streaming responses",
            )

        response = await ai_service.chat(messages=request.messages)

        await transaction_service.use_credits(
            user_id=user.id, amount=AI_CHAT_COST, description="AI chat request"
        )

        return ChatResponse(content=response)
    except ValueError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: TokenData = Depends(get_current_authenticated_user),
    transaction_service: TransactionService = Depends(get_transaction_service),
    user_repo: UserRepository = Depends(get_user_repo),
):
    try:
        if not current_user.email:
            raise HTTPException(status_code=401, detail="Unauthorized")

        user = await user_repo.get_by_email(current_user.email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        balance = await transaction_service.get_balance(user.id)
        if balance < AI_CHAT_COST:
            raise HTTPException(
                status_code=402,
                detail=(
                    f"Insufficient credits: {balance} available {AI_CHAT_COST} required"
                ),
            )

        if not request.stream:
            raise HTTPException(
                status_code=400, detail="Stream parameter must be set to true"
            )

        await transaction_service.use_credits(
            user_id=user.id,
            amount=AI_CHAT_COST,
            description="AI chat stream request",
        )

        async def generate():
            async for chunk in ai_service.chat_stream(messages=request.messages):
                yield chunk

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
