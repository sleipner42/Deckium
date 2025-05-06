from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.user import User, UserCreate, UserUpdate
from app.repositories.user import UserRepository
from app.main import get_user_repo

router = APIRouter()


@router.get("/", response_model=List[User])
async def read_users(
    skip: int = 0, 
    limit: int = 100,
    repo: UserRepository = Depends(get_user_repo)
):
    return await repo.list(skip=skip, limit=limit)


@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate, 
    repo: UserRepository = Depends(get_user_repo)
):
    user = await repo.get_by_email(email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    return await repo.create(user_in=user_in)


@router.get("/{user_id}", response_model=User)
async def read_user(
    user_id: int, 
    repo: UserRepository = Depends(get_user_repo)
):
    user = await repo.get(user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    repo: UserRepository = Depends(get_user_repo)
):
    user = await repo.update(user_id=user_id, user_in=user_in)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.delete("/{user_id}", response_model=User)
async def delete_user(
    user_id: int,
    repo: UserRepository = Depends(get_user_repo)
):
    user = await repo.delete(user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user 