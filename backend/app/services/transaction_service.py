from app.models.transaction import TransactionCreate
from app.repositories.transaction import TransactionRepository


class TransactionService:
    def __init__(self, transaction_repo: TransactionRepository):
        self.transaction_repo = transaction_repo

    async def add_credits(
        self, user_id: int, amount: float, description: str = "Credit added"
    ) -> float:
        transaction = TransactionCreate(
            user_id=user_id, amount=amount, description=description
        )
        await self.transaction_repo.create(transaction)
        return await self.get_balance(user_id)

    async def use_credits(
        self, user_id: int, amount: float, description: str = "Credit used"
    ) -> float:
        if amount <= 0:
            raise ValueError("Amount must be positive")

        current_balance = await self.get_balance(user_id)
        if current_balance < amount:
            raise ValueError(
                f"Insufficient credits: {current_balance} available, {amount} required"
            )

        transaction = TransactionCreate(
            user_id=user_id,
            amount=-amount,  # Negative amount for usage
            description=description,
        )
        await self.transaction_repo.create(transaction)
        return await self.get_balance(user_id)

    async def get_balance(self, user_id: int) -> float:
        return await self.transaction_repo.get_user_balance(user_id)

    async def get_transactions(self, user_id: int):
        return await self.transaction_repo.get_by_user_id(user_id)
