from app.core.config import settings
from app.repositories.sqlite_user_repository import SQLiteUserRepository
from app.repositories.sqlite_transaction_repository import (
    SQLiteTransactionRepository,
)
from app.repositories.sqlite_auth_repository import (
    SQLiteAuthorizedEmailRepository,
)
from app.services.transaction_service import TransactionService


def get_user_repo():
    return SQLiteUserRepository(settings.DATABASE_URL)


def get_transaction_repo():
    return SQLiteTransactionRepository(settings.DATABASE_URL)


def get_auth_repo():
    return SQLiteAuthorizedEmailRepository(settings.DATABASE_URL)


def get_transaction_service():
    return TransactionService(get_transaction_repo())
