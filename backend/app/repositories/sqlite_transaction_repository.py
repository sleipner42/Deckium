import aiosqlite
from datetime import datetime
from typing import List, Optional

from app.models.transaction import Transaction, TransactionCreate
from app.repositories.transaction import TransactionRepository


class SQLiteTransactionRepository(TransactionRepository):
    def __init__(self, db_path: str):
        self.db_path = db_path

    async def _get_db(self) -> aiosqlite.Connection:
        db = await aiosqlite.connect(
            self.db_path, isolation_level=None, check_same_thread=False
        )
        db.row_factory = aiosqlite.Row
        return db

    async def create(self, transaction_in: TransactionCreate) -> Transaction:
        db = await self._get_db()
        try:
            current_time = datetime.utcnow()
            sql = (
                'INSERT INTO "transaction" '
                "(user_id, amount, description, created_at) "
                "VALUES (?, ?, ?, ?)"
            )
            params = (
                transaction_in.user_id,
                transaction_in.amount,
                transaction_in.description,
                current_time.isoformat(),
            )
            cursor = await db.execute(sql, params)
            await db.commit()
            transaction_id = cursor.lastrowid
            await cursor.close()

            if transaction_id is None:
                raise RuntimeError("Failed to get last row ID after insert.")

            return Transaction(
                id=transaction_id,
                user_id=transaction_in.user_id,
                amount=transaction_in.amount,
                description=transaction_in.description,
                created_at=current_time,
            )
        finally:
            await db.close()

    async def get(self, transaction_id: int) -> Optional[Transaction]:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                'SELECT * FROM "transaction" WHERE id = ?', (transaction_id,)
            )
            row = await cursor.fetchone()
            await cursor.close()

            if not row:
                return None

            return Transaction(
                id=row["id"],
                user_id=row["user_id"],
                amount=row["amount"],
                description=row["description"],
                created_at=datetime.fromisoformat(row["created_at"]),
            )
        finally:
            await db.close()

    async def get_by_user_id(self, user_id: int) -> List[Transaction]:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                'SELECT * FROM "transaction" WHERE user_id = ? '
                "ORDER BY created_at DESC",
                (user_id,),
            )
            rows = await cursor.fetchall()
            await cursor.close()

            return [
                Transaction(
                    id=row["id"],
                    user_id=row["user_id"],
                    amount=row["amount"],
                    description=row["description"],
                    created_at=datetime.fromisoformat(row["created_at"]),
                )
                for row in rows
            ]
        finally:
            await db.close()

    async def get_user_balance(self, user_id: int) -> float:
        db = await self._get_db()
        try:
            query = 'SELECT SUM(amount) as balance FROM "transaction" WHERE user_id = ?'
            cursor = await db.execute(query, (user_id,))
            row = await cursor.fetchone()
            await cursor.close()

            if not row or row["balance"] is None:
                return 0.0

            return float(row["balance"])
        finally:
            await db.close()
