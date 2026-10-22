from datetime import datetime, timezone
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    RegisterRequest,
    UpdateProfileRequest,
    UserResponse,
)


def test_change_password_request_accepts_valid_data() -> None:
    request = ChangePasswordRequest(
        current_password="strongpass",
        new_password="newstrongpass",
    )

    assert request.current_password == "strongpass"
    assert request.new_password == "newstrongpass"


def test_change_password_request_rejects_short_new_password() -> None:
    with pytest.raises(ValidationError):
        ChangePasswordRequest(
            current_password="strongpass",
            new_password="short",
        )


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


def test_update_profile_request_accepts_height_only() -> None:
    request = UpdateProfileRequest(height_cm=180)

    assert request.height_cm == 180
    assert request.body_weight_kg is None


def test_update_profile_request_accepts_weight_only() -> None:
    request = UpdateProfileRequest(body_weight_kg=Decimal("75.5"))

    assert request.height_cm is None
    assert request.body_weight_kg == Decimal("75.5")


def test_update_profile_request_rejects_zero_height() -> None:
    with pytest.raises(ValidationError):
        UpdateProfileRequest(height_cm=0)


def test_update_profile_request_rejects_negative_weight() -> None:
    with pytest.raises(ValidationError):
        UpdateProfileRequest(body_weight_kg=Decimal("-75.5"))


def test_update_profile_request_rejects_weight_with_three_decimals() -> None:
    with pytest.raises(ValidationError):
        UpdateProfileRequest(body_weight_kg=Decimal("75.555"))
