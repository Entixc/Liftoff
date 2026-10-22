from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.body_weight_entry import BodyWeightEntry


def register_and_login(client: TestClient, nickname: str) -> dict[str, str]:
    credentials = {
        "nickname": nickname,
        "email": f"{nickname}@example.com",
        "password": "strongpass",
    }
    assert client.post("/auth/register", json=credentials).status_code == 201
    token = client.post("/auth/login", json=credentials).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_weight_history_is_private_and_records_changes(client: TestClient, db_session: Session) -> None:
    owner = register_and_login(client, "weight-owner")
    other = register_and_login(client, "weight-other")
    assert client.get("/auth/me/weight-history").status_code == 401
    assert client.patch("/auth/me", json={"body_weight_kg": "75.50"}, headers=owner).status_code == 200
    assert client.patch("/auth/me", json={"height_cm": 180, "body_weight_kg": "75.50"}, headers=owner).status_code == 200
    assert client.patch("/auth/me", json={"body_weight_kg": "74.25"}, headers=owner).status_code == 200
    assert client.patch("/auth/me", json={"body_weight_kg": None}, headers=owner).status_code == 200
    response = client.get("/auth/me/weight-history", headers=owner)
    assert response.status_code == 200
    assert [entry["weight_kg"] for entry in response.json()] == ["75.50", "74.25"]
    assert all(entry["recorded_at"] for entry in response.json())
    assert client.get("/auth/me/weight-history", headers=other).json() == []
    assert len(db_session.scalars(select(BodyWeightEntry)).all()) == 2
