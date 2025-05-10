import logging
import secrets
import string

from app.core.auth import create_access_token
from app.core.config import settings
from app.dependencies import get_user_repo
from app.models.user import UserCreate
from app.repositories.user import UserRepository
from authlib.integrations.starlette_client import OAuth
from fastapi import (APIRouter, Depends, HTTPException, Request, Response,
                     status)
from fastapi.responses import RedirectResponse
from starlette.config import Config

router = APIRouter()

logger = logging.getLogger(__name__)

AUTHORIZED_EMAILS = [
    "kristoffer.nordstrom42@gmail.com",
]

config_data = {
    "GOOGLE_CLIENT_ID": str(settings.GOOGLE_CLIENT_ID),
    "GOOGLE_CLIENT_SECRET": str(settings.GOOGLE_CLIENT_SECRET),
}
starlette_config = Config(environ=config_data)

oauth = OAuth(starlette_config)
oauth.register(
    name="google",
    server_metadata_url=(
        "https://accounts.google.com/.well-known/openid-configuration"
    ),
    client_kwargs={"scope": "openid email profile"},
)

@router.get("/login")
async def login(request: Request):
    """Google login route that redirects to Google OAuth consent screen"""
    redirect_uri = settings.REDIRECT_URL

    
    state = secrets.token_urlsafe(16)
    request.session["oauth_state"] = state
    logger.info(f"Starting OAuth login flow with state: {state[:5]}...")

    return await oauth.google.authorize_redirect(request, redirect_uri, state=state)


@router.get("/callback")
async def auth_callback(
    request: Request, response: Response, repo: UserRepository = Depends(get_user_repo)
):
    """Callback route from Google OAuth, creates JWT and sets cookie"""
    try:
        token = await oauth.google.authorize_access_token(request)

        user_info = token.get("userinfo")
        if not user_info:
            raise HTTPException(status_code=400, detail="Could not fetch user info")

        email = user_info["email"]
        if email not in AUTHORIZED_EMAILS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not authorized to access this application",
            )

        existing_user = await repo.get_by_email(email)
        if not existing_user:
            alphabet = string.ascii_letters + string.digits
            password = "".join(secrets.choice(alphabet) for _ in range(20))
            user_create = UserCreate(
                email=email,
                password=password,
                full_name=user_info.get("name", ""),
                is_active=True,
                is_superuser=False,
            )
            await repo.create(user_in=user_create)

        jwt_data = {
            "sub": user_info["sub"],
            "email": user_info["email"],
            "name": user_info.get("name", ""),
            "picture": user_info.get("picture", ""),
        }
        access_token = create_access_token(data=jwt_data)

        response = RedirectResponse(url="/login_success")
        response.set_cookie(
            key="access_token",
            value=f"Bearer {access_token}",
            httponly=True,
            max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            secure=False,
            samesite="lax",
        )

        return response
    except Exception as e:
        logger.exception(f"Auth error: {str(e)}")
        error_msg = f"Authentication failed: {str(e)}"
        
        error_url = f"/login_failed?error={error_msg}"
        return RedirectResponse(url=error_url)


@router.get("/logout")
async def logout(response: Response):
    """Logout route that clears the auth cookie"""
    frontend_url = str(settings.FRONTEND_URL)
    response = RedirectResponse(url=frontend_url)
    response.delete_cookie(key="access_token")
    return response


@router.get("/login_success")
async def login_success():
    return "success"


@router.get("/login_failed")
async def login_failed(error: str = ""):
    return "failed"


@router.get("/me")
async def get_user(request: Request):
    """Returns user information from the auth cookie"""
    cookie_authorization = request.cookies.get("access_token")
    if not cookie_authorization or not cookie_authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    token = cookie_authorization.replace("Bearer ", "")

    try:
        from app.core.auth import ALGORITHM, SECRET_KEY, jwt

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "name": payload.get("name"),
            "picture": payload.get("picture"),
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
