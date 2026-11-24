from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.password_reset import hash_password_reset_token
from app.core.security import verify_password
from app.models.login_attempt import LoginAttempt
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.models.user_session import UserSession


ORIGIN = {"Origin": "http://localhost:5173", "X-Session-Client": "browser"}


def create_account(client: TestClient, monkeypatch):
    verification_tokens: list[str] = []
    reset_messages: list[tuple[str, str]] = []
    changed_notices: list[str] = []
    monkeypatch.setattr(
        "app.api.routes.auth.send_email_verification",
        lambda email, token: verification_tokens.append(token),
    )
    monkeypatch.setattr(
        "app.api.routes.auth.send_password_reset",
        lambda email, token: reset_messages.append((email, token)),
    )
    monkeypatch.setattr(
        "app.api.routes.auth.send_password_changed_notice",
        lambda email: changed_notices.append(email),
    )
    credentials = {
        "nickname": "nurzhan",
        "email": "nurzhan@example.com",
        "password": "strongpass",
    }
    assert client.post("/auth/register", json=credentials).status_code == 201
    return credentials, verification_tokens, reset_messages, changed_notices


def verify_account_email(client: TestClient, verification_tokens: list[str]) -> None:
    assert client.post(
        "/auth/email/verify",
        json={"token": verification_tokens[0]},
    ).status_code == 204


def test_forgot_password_response_does_not_reveal_account(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    _, _, reset_messages, _ = create_account(client, monkeypatch)

    unknown = client.post(
        "/auth/password/forgot",
        json={"email": "unknown@example.com"},
    )
    unverified = client.post(
        "/auth/password/forgot",
        json={"email": "Nurzhan@Example.COM"},
    )

    assert unknown.status_code == 202
    assert unverified.status_code == 202
    assert unknown.content == unverified.content
    assert reset_messages == []
    assert db_session.scalar(select(PasswordResetToken)) is None


def test_password_reset_is_one_time_and_revokes_sessions(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    credentials, verification_tokens, reset_messages, notices = create_account(
        client,
        monkeypatch,
    )
    verify_account_email(client, verification_tokens)
    assert client.post("/auth/login", json=credentials, headers=ORIGIN).status_code == 200
    assert db_session.scalar(select(UserSession)) is not None
    assert client.post(
        "/auth/login",
        json={"nickname": "nurzhan", "password": "wrongpass"},
    ).status_code == 401
    assert db_session.scalar(select(LoginAttempt)) is not None

    response = client.post(
        "/auth/password/forgot",
        json={"email": "NURZHAN@example.com"},
    )
    assert response.status_code == 202
    assert len(reset_messages) == 1
    recipient, raw_token = reset_messages[0]
    assert recipient == "nurzhan@example.com"
    stored = db_session.scalar(select(PasswordResetToken))
    assert stored is not None
    assert stored.token_hash == hash_password_reset_token(raw_token)
    assert raw_token != stored.token_hash

    unchanged = client.post(
        "/auth/password/reset",
        json={"token": raw_token, "new_password": "strongpass"},
    )
    assert unchanged.status_code == 400
    assert db_session.scalar(select(PasswordResetToken)) is not None

    reset = client.post(
        "/auth/password/reset",
        json={"token": raw_token, "new_password": "newstrongpass"},
    )

    assert reset.status_code == 204
    user = db_session.scalar(select(User))
    assert user is not None
    db_session.refresh(user)
    assert verify_password("newstrongpass", user.password_hash)
    assert db_session.scalar(select(PasswordResetToken)) is None
    assert db_session.scalar(select(UserSession)) is None
    assert db_session.scalar(select(LoginAttempt)) is None
    assert notices == ["nurzhan@example.com"]
    assert client.post(
        "/auth/password/reset",
        json={"token": raw_token, "new_password": "anotherpass"},
    ).status_code == 400
    client.cookies.clear()
    assert client.post(
        "/auth/login",
        json={"nickname": "nurzhan", "password": "strongpass"},
    ).status_code == 401
    assert client.post(
        "/auth/login",
        json={"nickname": "nurzhan", "password": "newstrongpass"},
    ).status_code == 200


def test_password_reset_request_cooldown_replaces_old_token(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    _, verification_tokens, reset_messages, _ = create_account(client, monkeypatch)
    verify_account_email(client, verification_tokens)
    payload = {"email": "nurzhan@example.com"}

    assert client.post("/auth/password/forgot", json=payload).status_code == 202
    first_raw_token = reset_messages[0][1]
    assert client.post("/auth/password/forgot", json=payload).status_code == 202
    assert len(reset_messages) == 1

    stored = db_session.scalar(select(PasswordResetToken))
    assert stored is not None
    stored.created_at = datetime.now(timezone.utc) - timedelta(minutes=2)
    db_session.commit()
    assert client.post("/auth/password/forgot", json=payload).status_code == 202
    assert len(reset_messages) == 2
    second_raw_token = reset_messages[1][1]
    assert second_raw_token != first_raw_token
    assert client.post(
        "/auth/password/reset",
        json={"token": first_raw_token, "new_password": "newstrongpass"},
    ).status_code == 400


def test_expired_password_reset_token_is_removed(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    _, verification_tokens, reset_messages, _ = create_account(client, monkeypatch)
    verify_account_email(client, verification_tokens)
    client.post(
        "/auth/password/forgot",
        json={"email": "nurzhan@example.com"},
    )
    stored = db_session.scalar(select(PasswordResetToken))
    assert stored is not None
    stored.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db_session.commit()

    response = client.post(
        "/auth/password/reset",
        json={
            "token": reset_messages[0][1],
            "new_password": "newstrongpass",
        },
    )

    assert response.status_code == 400
    assert db_session.scalar(select(PasswordResetToken)) is None
