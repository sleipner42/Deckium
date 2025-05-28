import aiosqlite
from typing import List, Optional
from datetime import datetime

from app.models.auth import (
    AuthorizedEmail, 
    AuthorizedEmailCreate, 
    AuthorizedEmailUpdate
)
from app.repositories.auth import AuthorizedEmailRepository


class SQLiteAuthorizedEmailRepository(AuthorizedEmailRepository):
    def __init__(self, db_path: str):
        self.db_path = db_path

    async def _get_db(self) -> aiosqlite.Connection:
        db = await aiosqlite.connect(
            self.db_path,
            isolation_level=None,
            check_same_thread=False
        )
        db.row_factory = aiosqlite.Row
        return db

    async def get(self, email_id: int) -> Optional[AuthorizedEmail]:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM authorized_emails WHERE id = ?", (email_id,)
            )
            row = await cursor.fetchone()
            await cursor.close()
            if row:
                return AuthorizedEmail(
                    id=row["id"],
                    email=row["email"],
                    is_active=bool(row["is_active"]),
                    created_at=datetime.fromisoformat(row["created_at"]),
                    created_by=row["created_by"]
                )
            return None
        finally:
            await db.close()

    async def get_by_email(self, email: str) -> Optional[AuthorizedEmail]:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM authorized_emails WHERE email = ?", (email,)
            )
            row = await cursor.fetchone()
            await cursor.close()
            if row:
                return AuthorizedEmail(
                    id=row["id"],
                    email=row["email"],
                    is_active=bool(row["is_active"]),
                    created_at=datetime.fromisoformat(row["created_at"]),
                    created_by=row["created_by"]
                )
            return None
        finally:
            await db.close()

    async def create(
        self, 
        email_in: AuthorizedEmailCreate, 
        created_by: Optional[int] = None
    ) -> AuthorizedEmail:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                """
                INSERT INTO authorized_emails (email, is_active, created_by)
                VALUES (?, ?, ?)
                """,
                (email_in.email, email_in.is_active, created_by)
            )
            email_id = cursor.lastrowid
            await cursor.close()
            await db.commit()
            
            if email_id is None:
                raise ValueError("Failed to create authorized email")
            
            result = await self.get(email_id)
            if result is None:
                raise ValueError("Failed to retrieve created authorized email")
            return result
        finally:
            await db.close()

    async def update(
        self, 
        email_id: int, 
        email_in: AuthorizedEmailUpdate
    ) -> Optional[AuthorizedEmail]:
        db = await self._get_db()
        try:
            update_fields = []
            values = []
            
            if email_in.is_active is not None:
                update_fields.append("is_active = ?")
                values.append(int(email_in.is_active))
            
            if not update_fields:
                return await self.get(email_id)
            
            values.append(email_id)
            query = (
                f"UPDATE authorized_emails SET {', '.join(update_fields)} "
                f"WHERE id = ?"
            )
            
            cursor = await db.execute(query, values)
            await cursor.close()
            await db.commit()
            
            return await self.get(email_id)
        finally:
            await db.close()

    async def delete(self, email_id: int) -> Optional[AuthorizedEmail]:
        db = await self._get_db()
        try:
            email = await self.get(email_id)
            if email:
                cursor = await db.execute(
                    "DELETE FROM authorized_emails WHERE id = ?", (email_id,)
                )
                await cursor.close()
                await db.commit()
            return email
        finally:
            await db.close()

    async def list(
        self, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[AuthorizedEmail]:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                """
                SELECT * FROM authorized_emails 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
                """,
                (limit, skip)
            )
            rows = await cursor.fetchall()
            await cursor.close()
            
            return [
                AuthorizedEmail(
                    id=row["id"],
                    email=row["email"],
                    is_active=bool(row["is_active"]),
                    created_at=datetime.fromisoformat(row["created_at"]),
                    created_by=row["created_by"]
                )
                for row in rows
            ]
        finally:
            await db.close()

    async def is_authorized(self, email: str) -> bool:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                """
                SELECT COUNT(*) FROM authorized_emails 
                WHERE email = ? AND is_active = 1
                """,
                (email,)
            )
            result = await cursor.fetchone()
            await cursor.close()
            if result is None:
                return False
            return result[0] > 0
        finally:
            await db.close() 