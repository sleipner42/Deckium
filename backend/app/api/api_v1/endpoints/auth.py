from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
import json
import requests
from urllib.parse import urlencode
from typing import Optional

from app.core.config import settings
from app.core.auth import create_access_token

router = APIRouter()

# OAuth configuration
config_data = {
    'GOOGLE_CLIENT_ID': settings.GOOGLE_CLIENT_ID,
    'GOOGLE_CLIENT_SECRET': settings.GOOGLE_CLIENT_SECRET,
}
starlette_config = Config(environ=config_data)

oauth = OAuth(starlette_config)
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)


@router.get("/login")
async def login(request: Request):
    """Google login route that redirects to Google OAuth consent screen"""
    redirect_uri = settings.REDIRECT_URL
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def auth_callback(request: Request, response: Response):
    """Callback route from Google OAuth, creates JWT and sets cookie"""
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get('userinfo')
    if not user_info:
        raise HTTPException(status_code=400, detail="Could not fetch user info")
    
    # Create JWT token with user information
    jwt_data = {
        "sub": user_info["sub"],
        "email": user_info["email"],
        "name": user_info.get("name", ""),
        "picture": user_info.get("picture", "")
    }
    access_token = create_access_token(data=jwt_data)
    
    # Set cookie with JWT token
    response = RedirectResponse(url=settings.FRONTEND_URL)
    response.set_cookie(
        key="access_token", 
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )
    
    return response


@router.get("/logout")
async def logout(response: Response):
    """Logout route that clears the auth cookie"""
    response = RedirectResponse(url=settings.FRONTEND_URL)
    response.delete_cookie(key="access_token")
    return response


@router.get("/me")
async def get_user(request: Request):
    """Returns user information from the auth cookie"""
    cookie_authorization = request.cookies.get("access_token")
    if not cookie_authorization or not cookie_authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    token = cookie_authorization.replace("Bearer ", "")
    
    try:
        from app.core.auth import jwt, SECRET_KEY, ALGORITHM
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "name": payload.get("name"),
            "picture": payload.get("picture")
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        ) 