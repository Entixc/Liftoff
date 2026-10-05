import pytest
from pydantic import ValidationError

from app.schemas.auth import RegisterRequest


def test_register_request_accepts_valid_data() -> None:
    request = RegisterRequest(
        nickname="nurzhan",
        password="strongpass",
    )

    assert request.nickname == "nurzhan"
    assert request.password == "strongpass"


def test_register_request_rejects_short_nickname() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(
            nickname="ab",
            password="strongpass",
        )


def test_register_request_rejects_short_password() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(
            nickname="nurzhan",
            password="short",
        )