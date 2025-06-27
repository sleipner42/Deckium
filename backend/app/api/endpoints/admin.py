from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.auth import (
    AuthorizedEmail,
    AuthorizedEmailCreate,
    AuthorizedEmailUpdate,
)
from app.models.user import User, UserUpdate
from app.models.transaction import Transaction
from app.repositories.auth import AuthorizedEmailRepository
from app.repositories.user import UserRepository
from app.services.transaction_service import TransactionService
from app.dependencies import (
    get_auth_repo,
    get_user_repo,
    get_transaction_service,
)
from app.api.deps import get_admin_user
from app.core.auth import TokenData

router = APIRouter()


@router.get("/authorized-emails", response_model=List[AuthorizedEmail])
async def list_authorized_emails(
    skip: int = 0,
    limit: int = 100,
    repo: AuthorizedEmailRepository = Depends(get_auth_repo),
    admin_user: TokenData = Depends(get_admin_user),
):
    return await repo.list(skip=skip, limit=limit)


@router.post("/authorized-emails", response_model=AuthorizedEmail)
async def create_authorized_email(
    email_in: AuthorizedEmailCreate,
    repo: AuthorizedEmailRepository = Depends(get_auth_repo),
    admin_user: TokenData = Depends(get_admin_user),
):
    existing = await repo.get_by_email(email_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already authorized",
        )
    return await repo.create(email_in)


@router.put("/authorized-emails/{email_id}", response_model=AuthorizedEmail)
async def update_authorized_email(
    email_id: int,
    email_in: AuthorizedEmailUpdate,
    repo: AuthorizedEmailRepository = Depends(get_auth_repo),
    admin_user: TokenData = Depends(get_admin_user),
):
    email = await repo.update(email_id, email_in)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authorized email not found",
        )
    return email


@router.delete("/authorized-emails/{email_id}", response_model=AuthorizedEmail)
async def delete_authorized_email(
    email_id: int,
    repo: AuthorizedEmailRepository = Depends(get_auth_repo),
    admin_user: TokenData = Depends(get_admin_user),
):
    email = await repo.delete(email_id)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authorized email not found",
        )
    return email


@router.get("/users", response_model=List[User])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    repo: UserRepository = Depends(get_user_repo),
    admin_user: TokenData = Depends(get_admin_user),
):
    return await repo.list(skip=skip, limit=limit)


@router.get("/users/{user_id}", response_model=User)
async def get_user(
    user_id: int,
    repo: UserRepository = Depends(get_user_repo),
    admin_user: TokenData = Depends(get_admin_user),
):
    user = await repo.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.put("/users/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    repo: UserRepository = Depends(get_user_repo),
    admin_user: TokenData = Depends(get_admin_user),
):
    user = await repo.update(user_id, user_in)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.delete("/users/{user_id}", response_model=User)
async def delete_user(
    user_id: int,
    repo: UserRepository = Depends(get_user_repo),
    admin_user: TokenData = Depends(get_admin_user),
):
    user = await repo.delete(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.get("/users/{user_id}/transactions", response_model=List[Transaction])
async def get_user_transactions(
    user_id: int,
    service: TransactionService = Depends(get_transaction_service),
    admin_user: TokenData = Depends(get_admin_user),
):
    return await service.get_transactions(user_id)


@router.get("/users/{user_id}/balance", response_model=float)
async def get_user_balance(
    user_id: int,
    service: TransactionService = Depends(get_transaction_service),
    admin_user: TokenData = Depends(get_admin_user),
):
    return await service.get_balance(user_id)


@router.post("/users/{user_id}/add-credits", response_model=float)
async def add_credits_to_user(
    user_id: int,
    amount: float,
    description: str = "Admin credit adjustment",
    service: TransactionService = Depends(get_transaction_service),
    user_repo: UserRepository = Depends(get_user_repo),
    admin_user: TokenData = Depends(get_admin_user),
):
    user = await user_repo.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive",
        )

    return await service.add_credits(user_id, amount, description)
