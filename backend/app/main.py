import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

    logger.info("Tables created successfully!")

    yield

    logger.info("Application shutdown complete.")


app = FastAPI(
    title="KeynotAI API",
    openapi_url=None,
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    same_site="lax",
    https_only=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://localhost:8123",
        "https://api.deckium.xyz",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:8123",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIST_PATH = Path(__file__).parent.parent / "admin-frontend" / "dist"

if FRONTEND_DIST_PATH.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(FRONTEND_DIST_PATH / "assets")),
        name="frontend-assets",
    )


@app.get("/admin")
@app.get("/admin/{path:path}")
async def serve_admin():
    from fastapi.responses import FileResponse

    index_file = FRONTEND_DIST_PATH / "index.html"

    if not index_file.exists():
        return {
            "message": (
                "Admin frontend not built. "
                "Run 'npm run build' in the frontend directory."
            )
        }

    return FileResponse(str(index_file))


@app.get("/")
def read_root() -> dict[str, str]:
    return {
        "message": (
            "Welcome to the KeynotAI API. Visit /admin for admin dashboard."
        )
    }


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
