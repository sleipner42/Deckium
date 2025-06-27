from fastapi import APIRouter

from app.api.endpoints import (
    items,
    users,
    auth,
    protected,
    ai,
    transactions,
    admin,
    pexels,
)

api_router = APIRouter()
api_router.include_router(items.router, prefix="/items", tags=["items"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(protected.router, prefix="/protected", tags=["protected"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(
    transactions.router, prefix="/transactions", tags=["transactions"]
)

api_router.include_router(admin.router, prefix="/admin-api", tags=["admin"])
api_router.include_router(pexels.router, prefix="/pexels", tags=["pexels"])
