from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.workout_set import WorkoutSet


def get_auth_headers(
    client: TestClient,
    nickname: str = "nurzhan",
) -> dict[str, str]:
    credentials = {
        "nickname": nickname,
        "email": f"{nickname}@example.com",
        "password": "strongpass",
    }
    client.post("/auth/register", json=credentials)
    login_response = client.post("/auth/login", json=credentials)
    return {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }


def create_workout_exercise(
    client: TestClient,
    db_session: Session,
    *,
    is_bodyweight: bool = False,
) -> tuple[dict[str, str], int, int]:
    headers = get_auth_headers(client)
    workout_response = client.post("/workouts", headers=headers)
    exercise = Exercise(
        name="Push-Ups" if is_bodyweight else "Barbell Bench Press",
        category="chest",
        is_bodyweight=is_bodyweight,
    )
    db_session.add(exercise)
    db_session.commit()
    db_session.refresh(exercise)
    workout_exercise_response = client.post(
        f"/workouts/{workout_response.json()['id']}/exercises",
        json={"exercise_id": exercise.id},
        headers=headers,
    )
    return (
        headers,
        workout_response.json()["id"],
        workout_exercise_response.json()["id"],
    )


def sets_url(workout_id: int, workout_exercise_id: int) -> str:
    return f"/workouts/{workout_id}/exercises/{workout_exercise_id}/sets"


def test_create_workout_sets_assigns_positions(
    client: TestClient,
    db_session: Session,
) -> None:
    headers, workout_id, workout_exercise_id = create_workout_exercise(
        client,
        db_session,
    )
    url = sets_url(workout_id, workout_exercise_id)

    first_response = client.post(
        url,
        json={"weight_kg": "60.00", "repetitions": 10},
        headers=headers,
    )
    second_response = client.post(
        url,
        json={"weight_kg": "65.50", "repetitions": 8},
        headers=headers,
    )

    assert first_response.status_code == 201
    assert first_response.json()["position"] == 1
    assert first_response.json()["is_completed"] is False
    assert second_response.status_code == 201
    assert second_response.json()["position"] == 2

    workout_sets = list(
        db_session.scalars(
            select(WorkoutSet).order_by(WorkoutSet.position)
        ).all()
    )
    assert [item.repetitions for item in workout_sets] == [10, 8]


def test_create_bodyweight_set_allows_missing_weight(
    client: TestClient,
    db_session: Session,
) -> None:
    headers, workout_id, workout_exercise_id = create_workout_exercise(
        client,
        db_session,
        is_bodyweight=True,
    )

    response = client.post(
        sets_url(workout_id, workout_exercise_id),
        json={"repetitions": 15},
        headers=headers,
    )

    assert response.status_code == 201
    assert response.json()["weight_kg"] is None


def test_create_weighted_set_requires_weight(
    client: TestClient,
    db_session: Session,
) -> None:
    headers, workout_id, workout_exercise_id = create_workout_exercise(
        client,
        db_session,
    )

    response = client.post(
        sets_url(workout_id, workout_exercise_id),
        json={"repetitions": 10},
        headers=headers,
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "Weight is required for this exercise"
    }


def test_list_workout_sets_returns_position_order(
    client: TestClient,
    db_session: Session,
) -> None:
    headers, workout_id, workout_exercise_id = create_workout_exercise(
        client,
        db_session,
    )
    url = sets_url(workout_id, workout_exercise_id)
    client.post(
        url,
        json={"weight_kg": "60", "repetitions": 10},
        headers=headers,
    )
    client.post(
        url,
        json={"weight_kg": "65", "repetitions": 8},
        headers=headers,
    )

    response = client.get(url, headers=headers)

    assert response.status_code == 200
    assert [item["position"] for item in response.json()] == [1, 2]
    assert [item["repetitions"] for item in response.json()] == [10, 8]


def test_update_workout_set_changes_values_and_completion(
    client: TestClient,
    db_session: Session,
) -> None:
    headers, workout_id, workout_exercise_id = create_workout_exercise(
        client,
        db_session,
    )
    url = sets_url(workout_id, workout_exercise_id)
    created_response = client.post(
        url,
        json={"weight_kg": "60", "repetitions": 10},
        headers=headers,
    )

    response = client.patch(
        f"{url}/{created_response.json()['id']}",
        json={
            "weight_kg": "62.50",
            "repetitions": 9,
            "is_completed": True,
        },
        headers=headers,
    )

    assert response.status_code == 200
    assert Decimal(response.json()["weight_kg"]) == Decimal("62.50")
    assert response.json()["repetitions"] == 9
    assert response.json()["is_completed"] is True


def test_delete_workout_set_removes_it(
    client: TestClient,
    db_session: Session,
) -> None:
    headers, workout_id, workout_exercise_id = create_workout_exercise(
        client,
        db_session,
    )
    url = sets_url(workout_id, workout_exercise_id)
    created_response = client.post(
        url,
        json={"weight_kg": "60", "repetitions": 10},
        headers=headers,
    )

    response = client.delete(
        f"{url}/{created_response.json()['id']}",
        headers=headers,
    )

    assert response.status_code == 204
    assert db_session.get(WorkoutSet, created_response.json()["id"]) is None


def test_update_workout_set_rejects_another_users_workout(
    client: TestClient,
    db_session: Session,
) -> None:
    headers, workout_id, workout_exercise_id = create_workout_exercise(
        client,
        db_session,
    )
    url = sets_url(workout_id, workout_exercise_id)
    created_response = client.post(
        url,
        json={"weight_kg": "60", "repetitions": 10},
        headers=headers,
    )
    another_user_headers = get_auth_headers(client, nickname="another-user")

    response = client.patch(
        f"{url}/{created_response.json()['id']}",
        json={"is_completed": True},
        headers=another_user_headers,
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workout exercise not found"}
