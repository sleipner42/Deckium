from app.repositories.sqlite_user_repository import SQLiteUserRepository

DATABASE_PATH = "./test.db"


async def get_user_repo() -> SQLiteUserRepository:
    return SQLiteUserRepository(DATABASE_PATH)
