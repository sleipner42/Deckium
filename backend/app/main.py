from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.api_v1.api import api_router
from app.core.config import settings
from app.db.session import init_db
from app.repositories.sqlite_user_repository import SQLiteUserRepository

app = FastAPI()

DATABASE_PATH = "./test.db"

# Add middlewares
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db_client():
    await init_db()


@app.get("/")
def read_root():
    return {"Hello": "World"}


# Simple example of how to use SQLiteUserRepository with dependency injection
async def get_user_repo() -> SQLiteUserRepository:
    return SQLiteUserRepository(DATABASE_PATH)


app.include_router(api_router, prefix=settings.API_V1_STR) 