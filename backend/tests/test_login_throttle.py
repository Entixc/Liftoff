from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.login_throttle import IP_FAILURE_LIMIT, login_retry_after
from app.models.login_attempt import LoginAttempt


CREDENTIALS = {
    "nickname": "nurzhan",
    "email": "nurzhan@example.com",
    "password": "strongpass",
}


def register(client: TestClient) -> None:
    assert client.post("/auth/register", json=CREDENTIALS).status_code == 201


def test_fifth_failed_login_is_throttled(
    client: TestClient,
    db_session: Session,
) -> None:
    register(client)

    for _ in range(4):
        response = client.post(
            "/auth/login",
            json={**CREDENTIALS, "password": "wrongpass"},
        )
        assert response.status_code == 401

    blocked = client.post(
        "/auth/login",
        json={**CREDENTIALS, "password": "wrongpass"},
    )
    assert blocked.status_code == 429
    assert 1 <= int(blocked.headers["retry-after"]) <= 900

    correct_password_is_temporarily_blocked = client.post(
        "/auth/login",
        json=CREDENTIALS,
    )
    assert correct_password_is_temporarily_blocked.status_code == 429
    assert len(db_session.scalars(select(LoginAttempt)).all()) == 5


def test_expired_failures_allow_login_and_are_cleaned(
    client: TestClient,
    db_session: Session,
) -> None:
    register(client)
    for _ in range(5):
        client.post(
            "/auth/login",
            json={**CREDENTIALS, "password": "wrongpass"},
        )

    for attempt in db_session.scalars(select(LoginAttempt)):
        attempt.failed_at = datetime.now(timezone.utc) - timedelta(minutes=16)
    db_session.commit()

    response = client.post("/auth/login", json=CREDENTIALS)

    assert response.status_code == 200
    assert db_session.scalars(select(LoginAttempt)).all() == []


def test_successful_login_clears_pair_failures(
    client: TestClient,
    db_session: Session,
) -> None:
    register(client)
    for _ in range(3):
        client.post(
            "/auth/login",
            json={**CREDENTIALS, "password": "wrongpass"},
        )

    assert client.post("/auth/login", json=CREDENTIALS).status_code == 200
    assert db_session.scalars(select(LoginAttempt)).all() == []

    assert client.post(
        "/auth/login",
        json={**CREDENTIALS, "password": "wrongpass"},
    ).status_code == 401


def test_ip_wide_limit_blocks_password_spraying(db_session: Session) -> None:
    now = datetime.now(timezone.utc)
    db_session.add_all(
        LoginAttempt(
            client_ip="192.0.2.10",
            nickname_key=f"user-{index}",
            failed_at=now,
        )
        for index in range(IP_FAILURE_LIMIT)
    )
    db_session.commit()

    retry_after = login_retry_after(
        db_session,
        "192.0.2.10",
        "another-user",
        now=now,
    )

    assert retry_after == 900
