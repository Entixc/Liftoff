import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

from app.core.security import JWT_ALGORITHM


def test_get_my_profile_returns_authenticated_user(client: TestClient) -> None:
    credentials = {
        "nickname": "nurzhan",
        "email": "nurzhan@example.com",
        "password": "strongpass",
    }

    registration_response = client.post("/auth/register", json=credentials)
    login_response = client.post("/auth/login", json=credentials)

    access_token = login_response.json()["access_token"]
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert registration_response.status_code == 201
    assert login_response.status_code == 200
    assert response.status_code == 200
    assert response.json()["id"] == registration_response.json()["id"]
    assert response.json()["nickname"] == "nurzhan"
    assert "password_hash" not in response.json()


def test_get_my_profile_requires_token(client: TestClient) -> None:
    response = client.get("/auth/me")

    assert response.status_code == 401


def test_get_my_profile_rejects_invalid_token(
    client: TestClient,
) -> None:
    response = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Could not validate credentials"
    }


def test_get_my_profile_rejects_expired_token(
    client: TestClient,
) -> None:
    expired_token = jwt.encode(
        {
            "sub": "1",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        os.environ["JWT_SECRET_KEY"],
        algorithm=JWT_ALGORITHM,
    )

    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Could not validate credentials"
    }


def test_get_my_profile_rejects_token_for_deleted_user(
    client: TestClient,
) -> None:
    token_for_missing_user = jwt.encode(
        {"sub": "999"},
        os.environ["JWT_SECRET_KEY"],
        algorithm=JWT_ALGORITHM,
    )

    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token_for_missing_user}"},
    )

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Could not validate credentials"
    }
