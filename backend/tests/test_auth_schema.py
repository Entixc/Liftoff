from datetime import datetime, timezone
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.user import User
from app.schemas.auth import RegisterRequest, UserResponse


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


def test_user_response_excludes_password_hash() -> None:
    user = User(
        id=1,
        nickname="nurzhan",
        password_hash="secret-hash",
        height_cm=180,
        body_weight_kg=Decimal("75.50"),
        created_at=datetime(2026, 10, 9, tzinfo=timezone.utc),
    )

    response = UserResponse.model_validate(user)

    assert response.id == 1
    assert response.nickname == "nurzhan"
    assert "password_hash" not in response.model_dump()
