from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.email_verification import hash_email_verification_token
from app.models.email_verification_token import EmailVerificationToken
from app.models.user import User


def register(
    client: TestClient,
    monkeypatch,
) -> tuple[dict[str, str], list[tuple[str, str]]]:
    delivered: list[tuple[str, str]] = []
    monkeypatch.setattr(
        "app.api.routes.auth.send_email_verification",
        lambda email, token: delivered.append((email, token)),
    )
    credentials = {
        "nickname": "nurzhan",
        "email": "Nurzhan@Example.COM",
        "password": "strongpass",
    }
    response = client.post("/auth/register", json=credentials)
    assert response.status_code == 201
    return credentials, delivered


def bearer_headers(client: TestClient, credentials: dict[str, str]) -> dict[str, str]:
    response = client.post("/auth/login", json=credentials)
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_registration_delivers_hashed_one_time_verification_token(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    _, delivered = register(client, monkeypatch)

    assert len(delivered) == 1
    recipient, raw_token = delivered[0]
    assert recipient == "nurzhan@example.com"
    stored = db_session.scalar(select(EmailVerificationToken))
    assert stored is not None
    assert stored.token_hash == hash_email_verification_token(raw_token)
    assert raw_token != stored.token_hash

    response = client.post("/auth/email/verify", json={"token": raw_token})

    assert response.status_code == 204
    user = db_session.scalar(select(User))
    assert user is not None
    db_session.refresh(user)
    assert user.email_verified_at is not None
    assert db_session.scalar(select(EmailVerificationToken)) is None
    assert client.post(
        "/auth/email/verify",
        json={"token": raw_token},
    ).status_code == 400


def test_expired_verification_token_is_rejected_and_removed(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    _, delivered = register(client, monkeypatch)
    token = db_session.scalar(select(EmailVerificationToken))
    assert token is not None
    token.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    response = client.post(
        "/auth/email/verify",
        json={"token": delivered[0][1]},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Invalid or expired verification token"
    }
    assert db_session.scalar(select(EmailVerificationToken)) is None


def test_authenticated_user_can_resend_after_cooldown(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    credentials, delivered = register(client, monkeypatch)
    headers = bearer_headers(client, credentials)

    too_soon = client.post("/auth/me/email/verification", headers=headers)
    assert too_soon.status_code == 429
    assert int(too_soon.headers["Retry-After"]) > 0

    original = db_session.scalar(select(EmailVerificationToken))
    assert original is not None
    original.created_at = datetime.now(timezone.utc) - timedelta(minutes=2)
    db_session.commit()
    original_raw_token = delivered[0][1]

    response = client.post("/auth/me/email/verification", headers=headers)

    assert response.status_code == 202
    assert len(delivered) == 2
    replacement_raw_token = delivered[1][1]
    assert replacement_raw_token != original_raw_token
    assert client.post(
        "/auth/email/verify",
        json={"token": original_raw_token},
    ).status_code == 400
    assert client.post(
        "/auth/email/verify",
        json={"token": replacement_raw_token},
    ).status_code == 204
    assert client.post(
        "/auth/me/email/verification",
        headers=headers,
    ).status_code == 409
