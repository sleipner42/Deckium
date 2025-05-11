from fastapi import APIRouter, Depends, HTTPException
from app.services.transaction_service import TransactionService
from app.dependencies import get_transaction_service, get_user_repo
from app.core.auth import TokenData
from app.repositories.user import UserRepository
from app.api.deps import get_current_authenticated_user

router = APIRouter()


@router.get("/balance", response_model=float)
async def get_user_balance(
    service: TransactionService = Depends(get_transaction_service),
    user_repo: UserRepository = Depends(get_user_repo),
    token_data: TokenData = Depends(get_current_authenticated_user),
):

    if not token_data.email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = await user_repo.get_by_email(token_data.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return await service.get_balance(user.id)
