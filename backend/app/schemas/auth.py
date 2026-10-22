from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class RegisterRequest(BaseModel):
    nickname: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    nickname: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class SessionLoginResponse(BaseModel):
    authenticated: Literal[True] = True


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nickname: str
    height_cm: int | None
    body_weight_kg: Decimal | None
    created_at: datetime


class UpdateProfileRequest(BaseModel):
    height_cm: Annotated[int | None, Field(gt=0)] = None
    body_weight_kg: Annotated[
        Decimal | None,
        Field(gt=0, lt=1000, decimal_places=2),
    ] = None


class BodyWeightEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    weight_kg: Decimal
    recorded_at: datetime
