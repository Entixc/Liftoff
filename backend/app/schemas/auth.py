from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class RegisterRequest(BaseModel):
    nickname: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nickname: str
    height_cm: int | None
    body_weight_kg: Decimal | None
    created_at: datetime
