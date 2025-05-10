from fastapi import HTTPException, Request, status
from app.core.auth import TokenData, get_current_user


async def get_current_authenticated_user(request: Request) -> TokenData:
    cookie_authorization = request.cookies.get("access_token")
    if not cookie_authorization or not cookie_authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = cookie_authorization.replace("Bearer ", "")
    if token.startswith('"') and token.endswith('"'):
        token = token[1:-1]
    user = await get_current_user(token)
    return user
