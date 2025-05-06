from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.api import api_router
from app.core.config import settings
from app.db.session import init_db

app = FastAPI()

DATABASE_PATH = "./test.db"


app.add_middleware(
    SessionMiddleware, 
    secret_key=settings.SECRET_KEY,
    max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    same_site="lax",
    https_only=False
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db_client() -> None:
    await init_db()

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        print("WARNING: Google OAuth credentials are not set or empty.")
        print("Please check your .env file and ensure GOOGLE_CLIENT_ID and")
        print("GOOGLE_CLIENT_SECRET are set.")
    else:
        print("Google OAuth configuration loaded.")
        print(f"Client ID: {settings.GOOGLE_CLIENT_ID[:8]}...")


@app.get("/")
def read_root() -> dict[str, str]:
    return {"Hello": "World"}


app.include_router(api_router)
