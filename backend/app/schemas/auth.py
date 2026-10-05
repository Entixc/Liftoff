from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    nickname: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)