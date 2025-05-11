from abc import ABC, abstractmethod
from typing import List, Optional

from app.models.transaction import Transaction, TransactionCreate


class TransactionRepository(ABC):
    @abstractmethod
    async def create(self, transaction_in: TransactionCreate) -> Transaction:
        pass

    @abstractmethod
    async def get(self, transaction_id: int) -> Optional[Transaction]:
        pass

    @abstractmethod
    async def get_by_user_id(self, user_id: int) -> List[Transaction]:
        pass

    @abstractmethod
    async def get_user_balance(self, user_id: int) -> float:
        pass
