import logging
import secrets

from authlib.integrations.starlette_client import OAuth
from fastapi import (
    APIRouter, 
    Depends, 
    HTTPException, 
    Request, 
    Response, 
    status
)
from fastapi.responses import RedirectResponse
from starlette.config import Config

from app.core.auth import create_access_token
from app.core.config import settings
from app.dependencies import (
    get_transaction_repo, 
    get_user_repo, 
    get_auth_repo
)
from app.factories.user_factory import create_oauth_user
from app.repositories.transaction import TransactionRepository
from app.repositories.user import UserRepository
from app.repositories.auth import AuthorizedEmailRepository

router = APIRouter()

logger = logging.getLogger(__name__)

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
    return await oauth.google.authorize_redirect(
        request, redirect_uri, state=state
    )


@router.get("/callback")
async def auth_callback(
    request: Request,
    response: Response,
    repo: UserRepository = Depends(get_user_repo),
    transaction_repo: TransactionRepository = Depends(get_transaction_repo),
    auth_repo: AuthorizedEmailRepository = Depends(get_auth_repo),
):
    """Callback route from Google OAuth, creates JWT and sets cookie"""
    try:
        token = await oauth.google.authorize_access_token(request)

        user_info = token.get("userinfo")
        if not user_info:
            raise HTTPException(
                status_code=400, detail="Could not fetch user info"
            )

        email = user_info["email"]
        is_authorized = await auth_repo.is_authorized(email)
        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not authorized to access this application",
            )

        await create_oauth_user(
            email=email,
            full_name=user_info.get("name", ""),
            repo=repo,
            transaction_repo=transaction_repo,
        )

        jwt_data = {
            "sub": user_info["sub"],
            "email": user_info["email"],
            "name": user_info.get("name", ""),
            "picture": user_info.get("picture", ""),
        }
        access_token = create_access_token(data=jwt_data)

        response = RedirectResponse(url="/auth/login_success")
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
        error_url = f"/auth/login_failed?error={error_msg}"
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
    if not cookie_authorization or not cookie_authorization.startswith(
        "Bearer "
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Not authenticated"
        )
    token = cookie_authorization.replace("Bearer ", "")
    print("token", token)

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
