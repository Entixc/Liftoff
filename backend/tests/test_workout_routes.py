from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise


def get_auth_headers(
    client: TestClient,
    nickname: str = "nurzhan",
) -> dict[str, str]:
    credentials = {
        "nickname": nickname,
        "password": "strongpass",
    }
    client.post("/auth/register", json=credentials)
    login_response = client.post("/auth/login", json=credentials)

    return {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }


def create_exercise(db_session: Session, name: str) -> Exercise:
    exercise = Exercise(
        name=name,
        category="chest",
        is_bodyweight=False,
    )
    db_session.add(exercise)
    db_session.commit()
    db_session.refresh(exercise)
    return exercise


def test_create_workout_creates_active_workout(
    client: TestClient,
    db_session: Session,
) -> None:
    response = client.post(
        "/workouts",
        headers=get_auth_headers(client),
    )

    assert response.status_code == 201
    assert response.json()["status"] == "active"
    assert response.json()["finished_at"] is None
    assert response.json()["started_at"] is not None

    workout = db_session.scalar(select(Workout))
    assert workout is not None
    assert workout.status == "active"


def test_create_workout_requires_authentication(
    client: TestClient,
) -> None:
    response = client.post("/workouts")

    assert response.status_code == 401

def test_create_workout_rejects_second_active_workout(
    client: TestClient,
    db_session: Session,
) -> None:
    headers = get_auth_headers(client)

    first_response = client.post("/workouts", headers=headers)
    second_response = client.post("/workouts", headers=headers)

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert second_response.json() == {
        "detail": "You already have an active workout"
    }

    workouts = list(db_session.scalars(select(Workout)).all())
    assert len(workouts) == 1


def test_get_active_workout_returns_current_users_workout(
    client: TestClient,
) -> None:
    headers = get_auth_headers(client)
    created_response = client.post("/workouts", headers=headers)

    response = client.get("/workouts/active", headers=headers)

    assert created_response.status_code == 201
    assert response.status_code == 200
    assert response.json()["id"] == created_response.json()["id"]
    assert response.json()["status"] == "active"


def test_get_active_workout_returns_404_when_absent(
    client: TestClient,
) -> None:
    response = client.get(
        "/workouts/active",
        headers=get_auth_headers(client),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "No active workout"}


def test_add_exercise_to_workout_assigns_positions(
    client: TestClient,
    db_session: Session,
) -> None:
    headers = get_auth_headers(client)
    workout_response = client.post("/workouts", headers=headers)
    first_exercise = create_exercise(db_session, "Barbell Bench Press")
    second_exercise = create_exercise(db_session, "Dumbbell Bench Press")

    first_response = client.post(
        f"/workouts/{workout_response.json()['id']}/exercises",
        json={"exercise_id": first_exercise.id},
        headers=headers,
    )
    second_response = client.post(
        f"/workouts/{workout_response.json()['id']}/exercises",
        json={"exercise_id": second_exercise.id},
        headers=headers,
    )

    assert workout_response.status_code == 201
    assert first_response.status_code == 201
    assert first_response.json()["position"] == 1
    assert second_response.status_code == 201
    assert second_response.json()["position"] == 2

    workout_exercises = list(
        db_session.scalars(
            select(WorkoutExercise).order_by(WorkoutExercise.position)
        ).all()
    )
    assert [item.exercise_id for item in workout_exercises] == [
        first_exercise.id,
        second_exercise.id,
    ]


def test_add_exercise_to_workout_rejects_unknown_exercise(
    client: TestClient,
) -> None:
    headers = get_auth_headers(client)
    workout_response = client.post("/workouts", headers=headers)

    response = client.post(
        f"/workouts/{workout_response.json()['id']}/exercises",
        json={"exercise_id": 999},
        headers=headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Exercise not found"}


def test_add_exercise_to_workout_rejects_duplicate_exercise(
    client: TestClient,
    db_session: Session,
) -> None:
    headers = get_auth_headers(client)
    workout_response = client.post("/workouts", headers=headers)
    exercise = create_exercise(db_session, "Barbell Bench Press")

    first_response = client.post(
        f"/workouts/{workout_response.json()['id']}/exercises",
        json={"exercise_id": exercise.id},
        headers=headers,
    )
    second_response = client.post(
        f"/workouts/{workout_response.json()['id']}/exercises",
        json={"exercise_id": exercise.id},
        headers=headers,
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert second_response.json() == {
        "detail": "Exercise is already in this workout"
    }


def test_add_exercise_to_workout_rejects_another_users_workout(
    client: TestClient,
    db_session: Session,
) -> None:
    owner_headers = get_auth_headers(client, nickname="owner")
    workout_response = client.post("/workouts", headers=owner_headers)
    exercise = create_exercise(db_session, "Barbell Bench Press")
    another_user_headers = get_auth_headers(client, nickname="another-user")

    response = client.post(
        f"/workouts/{workout_response.json()['id']}/exercises",
        json={"exercise_id": exercise.id},
        headers=another_user_headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workout not found"}


def test_list_workout_exercises_returns_position_order(
    client: TestClient,
    db_session: Session,
) -> None:
    headers = get_auth_headers(client)
    workout_response = client.post("/workouts", headers=headers)
    first_exercise = create_exercise(db_session, "Barbell Bench Press")
    second_exercise = create_exercise(db_session, "Dumbbell Bench Press")
    workout_id = workout_response.json()["id"]

    client.post(
        f"/workouts/{workout_id}/exercises",
        json={"exercise_id": first_exercise.id},
        headers=headers,
    )
    client.post(
        f"/workouts/{workout_id}/exercises",
        json={"exercise_id": second_exercise.id},
        headers=headers,
    )

    response = client.get(
        f"/workouts/{workout_id}/exercises",
        headers=headers,
    )

    assert response.status_code == 200
    assert [item["exercise_id"] for item in response.json()] == [
        first_exercise.id,
        second_exercise.id,
    ]
    assert [item["position"] for item in response.json()] == [1, 2]


def test_list_workout_exercises_rejects_another_users_workout(
    client: TestClient,
) -> None:
    owner_headers = get_auth_headers(client, nickname="owner")
    workout_response = client.post("/workouts", headers=owner_headers)
    another_user_headers = get_auth_headers(client, nickname="another-user")

    response = client.get(
        f"/workouts/{workout_response.json()['id']}/exercises",
        headers=another_user_headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workout not found"}
