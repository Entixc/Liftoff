from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet


def headers(client: TestClient, nickname: str) -> dict[str, str]:
    credentials = {"nickname": nickname, "password": "strongpass"}
    client.post("/auth/register", json=credentials)
    token = client.post("/auth/login", json=credentials).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_cancel_active_workout_removes_everything(
    client: TestClient, db_session: Session
) -> None:
    auth = headers(client, "owner")
    exercise = Exercise(name="Bench", category="chest", is_bodyweight=False)
    db_session.add(exercise)
    db_session.commit()
    workout_id = client.post("/workouts", headers=auth).json()["id"]
    item_id = client.post(
        f"/workouts/{workout_id}/exercises", headers=auth,
        json={"exercise_id": exercise.id},
    ).json()["id"]
    client.post(
        f"/workouts/{workout_id}/exercises/{item_id}/sets", headers=auth,
        json={"weight_kg": 60, "repetitions": 10},
    )

    assert client.delete(f"/workouts/{workout_id}", headers=auth).status_code == 204
    assert db_session.get(Workout, workout_id) is None
    assert list(db_session.scalars(select(WorkoutExercise))) == []
    assert list(db_session.scalars(select(WorkoutSet))) == []
    assert client.get("/workouts/history", headers=auth).json() == []
    assert client.post("/workouts", headers=auth).status_code == 201


def test_cancel_rejects_other_user_and_completed_workout(client: TestClient) -> None:
    owner = headers(client, "owner")
    other = headers(client, "other")
    workout_id = client.post("/workouts", headers=owner).json()["id"]
    assert client.delete(f"/workouts/{workout_id}", headers=other).status_code == 404
    assert client.get("/workouts/active", headers=owner).status_code == 200
    assert client.post(f"/workouts/{workout_id}/complete", headers=owner).status_code == 200
    assert client.delete(f"/workouts/{workout_id}", headers=owner).status_code == 409
    assert client.delete("/workouts/999", headers=owner).status_code == 404
    assert client.delete(f"/workouts/{workout_id}").status_code == 401
