from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class AuthorizedEmailBase(BaseModel):
    email: EmailStr
    is_active: bool = True


class AuthorizedEmailCreate(AuthorizedEmailBase):
    pass


class AuthorizedEmailUpdate(BaseModel):
    is_active: Optional[bool] = None


class AuthorizedEmailInDBBase(AuthorizedEmailBase):
    id: int
    created_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class AuthorizedEmail(AuthorizedEmailInDBBase):
    pass
