import logging
import os

import aiosqlite

from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

logger = logging.getLogger(__name__)


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DATABASE_URL)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    try:
        db_dir = os.path.dirname(DATABASE_URL)
        os.makedirs(db_dir, mode=0o755, exist_ok=True)
        logger.info(f"Ensuring database directory exists: {db_dir}")
    except Exception as e:
        logger.error(f"Failed to create database directory: {e}")
        raise

    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS user (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                full_name TEXT,
                is_active BOOLEAN DEFAULT 1,
                is_superuser BOOLEAN DEFAULT 0
            )
        """
        )

        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS "transaction" (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES user(id)
            )
        """
        )

        await db.commit()
        logger.info("Database initialized.")
