from fastapi import APIRouter

from app.api.api_v1.endpoints import items, users, auth, protected

api_router = APIRouter()
api_router.include_router(items.router, prefix="/items", tags=["items"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(protected.router, prefix="/protected", tags=["protected"]) 