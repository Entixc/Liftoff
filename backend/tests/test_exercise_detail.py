from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.exercise_muscle import ExerciseMuscle
from app.scripts import seed_exercises as seed_module


def auth(client: TestClient, nickname: str) -> dict[str, str]:
    credentials = {
        "nickname": nickname,
        "email": f"{nickname}@example.com",
        "password": "strongpass",
    }
    client.post("/auth/register", json=credentials)
    token = client.post("/auth/login", json=credentials).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_seed_keeps_existing_ids_and_is_idempotent(client: TestClient, db_session: Session, monkeypatch) -> None:
    original = Exercise(name="Barbell Bench Press", category="chest", is_bodyweight=False)
    db_session.add(original)
    db_session.commit()
    original_id = original.id
    monkeypatch.setattr(seed_module, "SessionLocal", lambda: db_session)

    seed_module.seed_exercises()
    seed_module.seed_exercises()

    catalog = client.get("/exercises").json()
    assert len(catalog) == 70
    assert db_session.scalar(select(Exercise).where(Exercise.name == "Barbell Bench Press")).id == original_id
    detail = client.get(f"/exercises/{original_id}").json()
    assert detail["description_en"]
    assert any(item["slug"] == "middle_chest" and item["role"] == "primary" for item in detail["muscles"])
    links = db_session.scalars(select(ExerciseMuscle).where(ExerciseMuscle.exercise_id == original_id)).all()
    assert len(links) == len(detail["muscles"])


def test_exercise_history_separates_active_and_completed_and_is_private(client: TestClient, db_session: Session) -> None:
    exercise = Exercise(name="Row", category="back", is_bodyweight=False, description_en="Row with control.")
    db_session.add(exercise)
    db_session.commit()
    owner = auth(client, "history-owner")
    other = auth(client, "history-other")
    assert client.get(f"/exercises/{exercise.id}/history").status_code == 401

    completed = client.post("/workouts", headers=owner).json()
    item = client.post(f"/workouts/{completed['id']}/exercises", json={"exercise_id": exercise.id}, headers=owner).json()
    created_set = client.post(
        f"/workouts/{completed['id']}/exercises/{item['id']}/sets",
        json={"weight_kg": 60, "repetitions": 8}, headers=owner,
    ).json()
    client.patch(
        f"/workouts/{completed['id']}/exercises/{item['id']}/sets/{created_set['id']}",
        json={"is_completed": True}, headers=owner,
    )
    client.post(f"/workouts/{completed['id']}/complete", headers=owner)
    active = client.post("/workouts", headers=owner).json()
    client.post(f"/workouts/{active['id']}/exercises", json={"exercise_id": exercise.id}, headers=owner)
    response = client.get(f"/exercises/{exercise.id}/history", headers=owner)
    assert response.status_code == 200
    assert response.json()["active"]["workout_id"] == active["id"]
    assert [item["workout_id"] for item in response.json()["completed"]] == [completed["id"]]
    assert response.json()["completed"][0]["sets"][0]["is_completed"] is True
    assert client.get(f"/exercises/{exercise.id}/history", headers=other).json() == {"active": None, "completed": []}
