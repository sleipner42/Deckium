from fastapi import Depends, HTTPException, status, Request
from typing import Optional

from app.core.auth import get_current_user, TokenData


async def get_current_authenticated_user(request: Request) -> TokenData:
    """
    Dependency that extracts the user info from the JWT token in the cookie
    and validates the token. To be used in protected routes.
    """
    cookie_authorization = request.cookies.get("access_token")
    if not cookie_authorization or not cookie_authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract the JWT token from the cookie
    token = cookie_authorization.replace("Bearer ", "")
    
    # Validate and get the user data from the token
    user = await get_current_user(token)
    return user 