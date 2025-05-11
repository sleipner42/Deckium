from pydantic import BaseModel
from datetime import datetime


class TransactionBase(BaseModel):
    user_id: int
    amount: float
    description: str = ""


class TransactionCreate(TransactionBase):
    pass


class TransactionInDBBase(TransactionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class Transaction(TransactionInDBBase):
    pass
