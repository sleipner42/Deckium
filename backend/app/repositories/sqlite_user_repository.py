import aiosqlite
from typing import List, Optional

from app.models.user import User, UserCreate, UserUpdate
from app.repositories.user import UserRepository
from app.core.security import get_password_hash


class SQLiteUserRepository(UserRepository):
    def __init__(self, db_path: str):
        self.db_path = db_path

    async def _get_db(self) -> aiosqlite.Connection:
        db = await aiosqlite.connect(self.db_path)
        db.row_factory = aiosqlite.Row
        return db

    async def get(self, user_id: int) -> Optional[User]:
        async with await self._get_db() as db:
            cursor = await db.execute(
                "SELECT * FROM user WHERE id = ?", (user_id,)
            )
            row = await cursor.fetchone()
            await cursor.close()
            return User(**row) if row else None

    async def get_by_email(self, email: str) -> Optional[User]:
        async with await self._get_db() as db:
            cursor = await db.execute(
                "SELECT * FROM user WHERE email = ?", (email,)
            )
            row = await cursor.fetchone()
            await cursor.close()
            return User(**row) if row else None

    async def create(self, user_in: UserCreate) -> User:
        hashed_password = get_password_hash(user_in.password)
        sql = (
            "INSERT INTO user (email, hashed_password, full_name, "
            "is_active, is_superuser) VALUES (?, ?, ?, ?, ?)"
        )
        params = (
            user_in.email,
            hashed_password,
            user_in.full_name,
            user_in.is_active,
            user_in.is_superuser,
        )
        async with await self._get_db() as db:
            cursor = await db.execute(sql, params)
            await db.commit()
            user_id = cursor.lastrowid
            await cursor.close()

            if user_id is None:  # Should not happen with autoincrement
                raise RuntimeError("Failed to get last row ID after insert.")

            return User(
                id=user_id,
                email=user_in.email,
                full_name=user_in.full_name,
                is_active=user_in.is_active,
                is_superuser=user_in.is_superuser
            )

    async def update(self, user_id: int, user_in: UserUpdate) -> Optional[User]:
        existing_user = await self.get(user_id)
        if not existing_user:
            return None

        update_data = user_in.model_dump(exclude_unset=True)
        hashed_password = None
        
        if "password" in update_data and update_data["password"]:
            pwd = update_data["password"]
            hashed_password = get_password_hash(pwd)
            del update_data["password"]
        elif "password" in update_data:
            del update_data["password"]

        set_clauses = [f"{key} = ?" for key in update_data.keys()]
        values = list(update_data.values())

        if hashed_password:
            set_clauses.append("hashed_password = ?")
            values.append(hashed_password)

        if not set_clauses:
            # Nothing to update
            return existing_user

        values.append(user_id)
        sql = f"UPDATE user SET {', '.join(set_clauses)} WHERE id = ?"

        async with await self._get_db() as db:
            await db.execute(sql, tuple(values))
            await db.commit()

        updated_user_data = existing_user.model_dump()
        updated_user_data.update(update_data)  # Apply non-password updates
        return User(**updated_user_data)

    async def delete(self, user_id: int) -> Optional[User]:
        existing_user = await self.get(user_id)
        if not existing_user:
            return None

        async with await self._get_db() as db:
            await db.execute("DELETE FROM user WHERE id = ?", (user_id,))
            await db.commit()
        return existing_user

    async def list(self, skip: int = 0, limit: int = 100) -> List[User]:
        async with await self._get_db() as db:
            cursor = await db.execute(
                "SELECT * FROM user LIMIT ? OFFSET ?", (limit, skip)
            )
            rows = await cursor.fetchall()
            await cursor.close()
            return [User(**row) for row in rows]