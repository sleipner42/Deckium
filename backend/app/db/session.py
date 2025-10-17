import logging
import os
from typing import AsyncGenerator

import aiosqlite

from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

logger = logging.getLogger(__name__)


async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    db = await aiosqlite.connect(DATABASE_URL)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    try:
        db_dir = os.path.dirname(DATABASE_URL)
        logger.info("Creating database directory: {db_dir}")
        os.makedirs(db_dir, mode=0o755, exist_ok=True)
        logger.info("Database directory created successfully")

        logger.info("Connecting to database at: {DATABASE_URL}")
    except Exception:
        logger.error("Failed to create database directory: {e}")
        raise

    try:
        async with aiosqlite.connect(DATABASE_URL) as db:
            logger.info("Connected to database successfully")

            logger.info("Creating user table...")
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS user (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    full_name TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    is_superuser BOOLEAN DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """
            )
            logger.info("User table created successfully")

            logger.info("Creating transaction table...")
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS "transaction" (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    amount REAL NOT NULL,
                    description TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES user(id)
                )
            """
            )
            logger.info("Transaction table created successfully")

            logger.info("Creating authorized_emails table...")
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS authorized_emails (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER,
                    FOREIGN KEY (created_by) REFERENCES user(id)
                )
            """
            )
            logger.info("Authorized emails table created successfully")

            logger.info("Seeding initial authorized emails...")
            initial_emails = ["admin@deckium.com"]

            for email in initial_emails:
                await db.execute(
                    """
                    INSERT OR IGNORE INTO authorized_emails (email, is_active)
                    VALUES (?, 1)
                    """,
                    (email,),
                )
            logger.info("Initial authorized emails seeded")

            await db.commit()
            logger.info("Database tables committed successfully")

            cursor = await db.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
            tables = await cursor.fetchall()
            logger.info(f"Tables in database: {[table[0] for table in tables]}")

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        logger.exception("Database error details:")
        raise

    logger.info("Database initialized successfully!")
