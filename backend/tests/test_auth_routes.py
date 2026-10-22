from decimal import Decimal

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.user import User


def test_register_user_creates_user(
    client: TestClient,
    db_session: Session,
) -> None:
    response = client.post(
        "/auth/register",
        json={
            "nickname": "nurzhan",
            "email": "Nurzhan@Example.COM",
            "password": "strongpass",
        },
    )

    assert response.status_code == 201
    assert response.json()["nickname"] == "nurzhan"
    assert response.json()["email"] == "nurzhan@example.com"
    assert response.json()["email_verified_at"] is None
    assert "password" not in response.json()
    assert "password_hash" not in response.json()

    user = db_session.scalar(
        select(User).where(User.nickname == "nurzhan")
    )
    assert user is not None
    assert user.email == "nurzhan@example.com"
    assert user.password_hash != "strongpass"
    assert verify_password("strongpass", user.password_hash)


def test_register_user_rejects_duplicate_nickname(client: TestClient) -> None:
    payload = {
        "nickname": "nurzhan",
        "email": "nurzhan@example.com",
        "password": "strongpass",
    }

    first_response = client.post("/auth/register", json=payload)
    second_response = client.post("/auth/register", json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert second_response.json() == {
        "detail": "Nickname is already registered"
    }


def test_register_user_rejects_invalid_request(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={"nickname": "ab", "password": "short"},
    )

    assert response.status_code == 422


def test_register_user_rejects_duplicate_email_case_insensitively(
    client: TestClient,
) -> None:
    first_response = client.post(
        "/auth/register",
        json={
            "nickname": "first-user",
            "email": "User@Example.COM",
            "password": "strongpass",
        },
    )
    second_response = client.post(
        "/auth/register",
        json={
            "nickname": "second-user",
            "email": "user@example.com",
            "password": "strongpass",
        },
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert second_response.json() == {"detail": "Email is already registered"}


def test_login_user_returns_access_token(client: TestClient) -> None:
    credentials = {
        "nickname": "nurzhan",
        "email": "nurzhan@example.com",
        "password": "strongpass",
    }
    registration_response = client.post("/auth/register", json=credentials)

    login_response = client.post("/auth/login", json=credentials)

    assert registration_response.status_code == 201
    assert login_response.status_code == 200
    assert login_response.json()["token_type"] == "bearer"

    payload = jwt.decode(
        login_response.json()["access_token"],
        "test-secret-key-with-at-least-32-bytes",
        algorithms=["HS256"],
    )
    assert payload["sub"] == str(registration_response.json()["id"])


def test_login_user_rejects_invalid_credentials(client: TestClient) -> None:
    client.post(
        "/auth/register",
        json={
            "nickname": "nurzhan",
            "email": "nurzhan@example.com",
            "password": "strongpass",
        },
    )

    wrong_password_response = client.post(
        "/auth/login",
        json={"nickname": "nurzhan", "password": "wrongpass"},
    )
    unknown_nickname_response = client.post(
        "/auth/login",
        json={"nickname": "unknown", "password": "strongpass"},
    )

    assert wrong_password_response.status_code == 401
    assert unknown_nickname_response.status_code == 401
    assert wrong_password_response.json() == {
        "detail": "Invalid nickname or password"
    }
    assert unknown_nickname_response.json() == wrong_password_response.json()


def test_update_my_profile_updates_only_provided_fields(
    client: TestClient,
) -> None:
    credentials = {
        "nickname": "nurzhan",
        "email": "nurzhan@example.com",
        "password": "strongpass",
    }
    client.post("/auth/register", json=credentials)
    login_response = client.post("/auth/login", json=credentials)
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }

    height_response = client.patch(
        "/auth/me",
        json={"height_cm": 180},
        headers=headers,
    )
    weight_response = client.patch(
        "/auth/me",
        json={"body_weight_kg": "75.5"},
        headers=headers,
    )

    assert height_response.status_code == 200
    assert height_response.json()["height_cm"] == 180
    assert height_response.json()["body_weight_kg"] is None
    assert weight_response.status_code == 200
    assert weight_response.json()["height_cm"] == 180
    assert Decimal(weight_response.json()["body_weight_kg"]) == Decimal("75.5")


def test_update_my_profile_clears_explicit_null_field(
    client: TestClient,
) -> None:
    credentials = {
        "nickname": "nurzhan",
        "email": "nurzhan@example.com",
        "password": "strongpass",
    }
    client.post("/auth/register", json=credentials)
    login_response = client.post("/auth/login", json=credentials)
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }
    client.patch(
        "/auth/me",
        json={"height_cm": 180, "body_weight_kg": "75.5"},
        headers=headers,
    )

    response = client.patch(
        "/auth/me",
        json={"height_cm": None},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["height_cm"] is None
    assert Decimal(response.json()["body_weight_kg"]) == Decimal("75.5")


def test_update_my_profile_rejects_empty_request(client: TestClient) -> None:
    credentials = {
        "nickname": "nurzhan",
        "email": "nurzhan@example.com",
        "password": "strongpass",
    }
    client.post("/auth/register", json=credentials)
    login_response = client.post("/auth/login", json=credentials)

    response = client.patch(
        "/auth/me",
        json={},
        headers={
            "Authorization": f"Bearer {login_response.json()['access_token']}"
        },
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "At least one profile field must be provided"
    }
