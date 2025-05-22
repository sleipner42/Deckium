from app.repositories.sqlite_user_repository import SQLiteUserRepository
from app.repositories.sqlite_transaction_repository import (
    SQLiteTransactionRepository,
)
from app.services.transaction_service import TransactionService
from app.core.config import settings


async def get_user_repo() -> SQLiteUserRepository:
    return SQLiteUserRepository(settings.DATABASE_URL)


async def get_transaction_repo() -> SQLiteTransactionRepository:
    return SQLiteTransactionRepository(settings.DATABASE_URL)


async def get_transaction_service() -> TransactionService:
    transaction_repo = await get_transaction_repo()
    return TransactionService(transaction_repo)
