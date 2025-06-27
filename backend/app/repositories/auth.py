from abc import ABC, abstractmethod
from typing import List, Optional

from app.models.auth import (
    AuthorizedEmail,
    AuthorizedEmailCreate,
    AuthorizedEmailUpdate,
)


class AuthorizedEmailRepository(ABC):

    @abstractmethod
    async def get(self, email_id: int) -> Optional[AuthorizedEmail]:
        pass

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[AuthorizedEmail]:
        pass

    @abstractmethod
    async def create(
        self, email_in: AuthorizedEmailCreate, created_by: Optional[int] = None
    ) -> AuthorizedEmail:
        pass

    @abstractmethod
    async def update(
        self, email_id: int, email_in: AuthorizedEmailUpdate
    ) -> Optional[AuthorizedEmail]:
        pass

    @abstractmethod
    async def delete(self, email_id: int) -> Optional[AuthorizedEmail]:
        pass

    @abstractmethod
    async def list(self, skip: int = 0, limit: int = 100) -> List[AuthorizedEmail]:
        pass

    @abstractmethod
    async def is_authorized(self, email: str) -> bool:
        pass
