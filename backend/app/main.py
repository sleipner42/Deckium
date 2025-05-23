import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.api import api_router
from app.core.config import settings
from app.db.session import init_db
import aiosqlite

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting application...")
    logger.info(f"Database URL: {settings.DATABASE_URL}")

    try:
        await init_db()
        logger.info("Database initialized successfully!")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        logger.exception("Database initialization error details:")
        raise

    oauth_check = (
        not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET
    )
    if oauth_check:
        logger.warning("Google OAuth credentials are not set or empty.")
        logger.warning("Please check your .env file.")
    else:
        logger.info("Google OAuth configuration loaded.")
        logger.info(f"Client ID: {settings.GOOGLE_CLIENT_ID[:8]}...")

    yield

    logger.info("Application shutdown complete.")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    same_site="lax",
    https_only=False,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"Hello": "World"}


@app.get("/health/db")
async def health_check_db():
    try:
        async with aiosqlite.connect(settings.DATABASE_URL) as db:
            cursor = await db.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
            tables = await cursor.fetchall()
            return {
                "status": "healthy",
                "database_url": settings.DATABASE_URL,
                "tables": [table[0] for table in tables],
            }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Database error: {str(e)}"
        )


app.include_router(api_router)
