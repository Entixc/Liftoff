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
        json={"nickname": "nurzhan", "password": "strongpass"},
    )

    assert response.status_code == 201
    assert response.json()["nickname"] == "nurzhan"
    assert "password" not in response.json()
    assert "password_hash" not in response.json()

    user = db_session.scalar(
        select(User).where(User.nickname == "nurzhan")
    )
    assert user is not None
    assert user.password_hash != "strongpass"
    assert verify_password("strongpass", user.password_hash)


def test_register_user_rejects_duplicate_nickname(client: TestClient) -> None:
    payload = {"nickname": "nurzhan", "password": "strongpass"}

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


def test_login_user_returns_access_token(client: TestClient) -> None:
    credentials = {"nickname": "nurzhan", "password": "strongpass"}
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
        json={"nickname": "nurzhan", "password": "strongpass"},
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
