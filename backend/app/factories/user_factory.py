import secrets
import string
from typing import Optional

from app.models.user import UserCreate
from app.repositories.user import UserRepository
from app.models.transaction import TransactionCreate
from app.repositories.transaction import TransactionRepository


async def create_oauth_user(
    email: str,
    full_name: str,
    repo: UserRepository,
    transaction_repo: TransactionRepository,
) -> None:
    existing_user = await repo.get_by_email(email)
    if not existing_user:
            
        alphabet = string.ascii_letters + string.digits
        password = "".join(secrets.choice(alphabet) for _ in range(20))
        user_create = UserCreate(
            email=email,
            password=password,
            full_name=full_name,
            is_active=True,
            is_superuser=False,
        )
        new_user = await repo.create(user_in=user_create)

        if transaction_repo and new_user:
            initial_credits = TransactionCreate(
                user_id=new_user.id,
                amount=1000.0,
                description="Initial credits for new user",
            )
            await transaction_repo.create(initial_credits)
