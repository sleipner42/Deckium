from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_authenticated_user
from app.core.auth import TokenData

router = APIRouter()


@router.get("/protected")
async def protected_route(current_user: TokenData = Depends(get_current_authenticated_user)):
    """
    Example of a protected route that requires authentication.
    Returns user info from JWT token.
    """
    return {
        "message": "You are authenticated!",
        "user_id": current_user.sub,
        "email": current_user.email
    } 