from app.repositories.sqlite_user_repository import SQLiteUserRepository
from app.repositories.sqlite_transaction_repository import (
    SQLiteTransactionRepository
)
from app.services.transaction_service import TransactionService

DATABASE_PATH = "./test.db"


async def get_user_repo() -> SQLiteUserRepository:
    return SQLiteUserRepository(DATABASE_PATH)


async def get_transaction_repo() -> SQLiteTransactionRepository:
    return SQLiteTransactionRepository(DATABASE_PATH)


async def get_transaction_service() -> TransactionService:
    transaction_repo = await get_transaction_repo()
    return TransactionService(transaction_repo)
