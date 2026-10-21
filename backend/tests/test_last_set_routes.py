from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.exercise import Exercise


def headers(client: TestClient, nickname: str) -> dict[str, str]:
    credentials = {"nickname": nickname, "password": "strongpass"}
    client.post("/auth/register", json=credentials)
    token = client.post("/auth/login", json=credentials).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_last_set_is_latest_for_current_user_only(
    client: TestClient, db_session: Session
) -> None:
    owner = headers(client, "owner")
    other = headers(client, "other")
    exercise = Exercise(name="Bench Press", category="chest", is_bodyweight=False)
    db_session.add(exercise)
    db_session.commit()
    url = f"/exercises/{exercise.id}/last-set"
    assert client.get(url, headers=owner).status_code == 404
    assert client.get(url).status_code == 401

    workout_id = client.post("/workouts", headers=owner).json()["id"]
    item_id = client.post(
        f"/workouts/{workout_id}/exercises", headers=owner,
        json={"exercise_id": exercise.id},
    ).json()["id"]
    sets_url = f"/workouts/{workout_id}/exercises/{item_id}/sets"
    first = client.post(sets_url, headers=owner, json={"weight_kg": 60, "repetitions": 10})
    latest = client.post(sets_url, headers=owner, json={"weight_kg": 65, "repetitions": 8})
    assert client.get(url, headers=owner).json()["id"] == latest.json()["id"]
    assert client.get(url, headers=other).status_code == 404

    client.delete(f"{sets_url}/{latest.json()['id']}", headers=owner)
    assert client.get(url, headers=owner).json()["id"] == first.json()["id"]


def test_last_set_survives_completed_workout_and_supports_bodyweight(
    client: TestClient, db_session: Session
) -> None:
    auth = headers(client, "owner")
    exercise = Exercise(name="Pull-Ups", category="back", is_bodyweight=True)
    db_session.add(exercise)
    db_session.commit()
    first_workout = client.post("/workouts", headers=auth).json()["id"]
    first_item = client.post(
        f"/workouts/{first_workout}/exercises", headers=auth,
        json={"exercise_id": exercise.id},
    ).json()["id"]
    first_set = client.post(
        f"/workouts/{first_workout}/exercises/{first_item}/sets", headers=auth,
        json={"weight_kg": None, "repetitions": 7},
    ).json()
    client.post(f"/workouts/{first_workout}/complete", headers=auth)
    second_workout = client.post("/workouts", headers=auth).json()["id"]
    client.post(
        f"/workouts/{second_workout}/exercises", headers=auth,
        json={"exercise_id": exercise.id},
    )

    response = client.get(f"/exercises/{exercise.id}/last-set", headers=auth)
    assert response.status_code == 200
    assert response.json()["id"] == first_set["id"]
    assert response.json()["weight_kg"] is None
    assert response.json()["repetitions"] == 7
