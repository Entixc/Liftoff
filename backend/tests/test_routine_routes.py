from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.routine import Routine
from app.models.routine_exercise import RoutineExercise
from app.models.routine_set import RoutineSet
from app.models.workout import Workout
from app.models.workout_exercise import WorkoutExercise


def headers(client: TestClient, nickname: str = "owner") -> dict[str, str]:
    credentials = {
        "nickname": nickname,
        "email": f"{nickname}@example.com",
        "password": "strongpass",
    }
    client.post("/auth/register", json=credentials)
    token = client.post("/auth/login", json=credentials).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def catalog(db: Session) -> list[int]:
    exercises = [
        Exercise(name=name, category="chest", is_bodyweight=False)
        for name in ("Bench Press", "Dumbbell Press", "Cable Fly")
    ]
    db.add_all(exercises)
    db.commit()
    return [exercise.id for exercise in exercises]


def test_routine_crud_and_order(client: TestClient, db_session: Session) -> None:
    auth = headers(client)
    ids = catalog(db_session)
    created = client.post(
        "/routines", headers=auth,
        json={"name": "  Chest day  ", "exercise_ids": [ids[1], ids[0]]},
    )
    assert created.status_code == 201
    routine_id = created.json()["id"]
    assert created.json()["name"] == "Chest day"
    assert created.json()["exercise_ids"] == [ids[1], ids[0]]
    assert client.get("/routines", headers=auth).json()[0]["id"] == routine_id

    updated = client.put(
        f"/routines/{routine_id}", headers=auth,
        json={"name": "Push", "exercise_ids": [ids[2], ids[1]]},
    )
    assert updated.status_code == 200
    assert updated.json()["exercise_ids"] == [ids[2], ids[1]]
    assert len(list(db_session.scalars(select(RoutineExercise)))) == 2

    deleted = client.delete(f"/routines/{routine_id}", headers=auth)
    assert deleted.status_code == 204
    assert db_session.get(Routine, routine_id) is None
    assert list(db_session.scalars(select(RoutineExercise))) == []


def test_routine_rejects_invalid_exercises_and_duplicates(
    client: TestClient, db_session: Session
) -> None:
    auth = headers(client)
    ids = catalog(db_session)
    for exercise_ids in ([ids[0], ids[0]], [ids[0], 9999], []):
        response = client.post(
            "/routines", headers=auth,
            json={"name": "Test", "exercise_ids": exercise_ids},
        )
        assert response.status_code == 422
    assert list(db_session.scalars(select(Routine))) == []


def test_routine_is_private(client: TestClient, db_session: Session) -> None:
    owner = headers(client)
    exercise_id = catalog(db_session)[0]
    routine_id = client.post(
        "/routines", headers=owner,
        json={"name": "Mine", "exercise_ids": [exercise_id]},
    ).json()["id"]
    other = headers(client, "other")
    assert client.get("/routines", headers=other).json() == []
    assert client.put(
        f"/routines/{routine_id}", headers=other,
        json={"name": "Stolen", "exercise_ids": [exercise_id]},
    ).status_code == 404
    assert client.post(f"/routines/{routine_id}/start", headers=other).status_code == 404
    assert client.delete(f"/routines/{routine_id}", headers=other).status_code == 404


def test_start_routine_copies_exercises_without_sets_and_rejects_active(
    client: TestClient, db_session: Session
) -> None:
    auth = headers(client)
    ids = catalog(db_session)
    routine_id = client.post(
        "/routines", headers=auth,
        json={"name": "Chest", "exercise_ids": [ids[2], ids[0]]},
    ).json()["id"]
    started = client.post(f"/routines/{routine_id}/start", headers=auth)
    assert started.status_code == 201
    assert started.json()["status"] == "active"
    workout_id = started.json()["id"]
    copied = client.get(f"/workouts/{workout_id}/exercises", headers=auth).json()
    assert [item["exercise_id"] for item in copied] == [ids[2], ids[0]]
    assert client.get(
        f"/workouts/{workout_id}/exercises/{copied[0]['id']}/sets", headers=auth
    ).json() == []
    assert client.post(f"/routines/{routine_id}/start", headers=auth).status_code == 409
    assert len(list(db_session.scalars(select(Workout)))) == 1
    assert len(list(db_session.scalars(select(WorkoutExercise)))) == 2


def test_routine_planned_sets_copy_as_uncompleted_and_stay_independent(
    client: TestClient, db_session: Session
) -> None:
    auth = headers(client)
    ids = catalog(db_session)
    created = client.post(
        "/routines", headers=auth,
        json={
            "name": "Chest",
            "exercise_ids": [ids[1], ids[0]],
            "planned_sets": [
                {"exercise_id": ids[0], "weight_kg": "60.00", "repetitions": 10},
                {"exercise_id": ids[0], "weight_kg": "65.50", "repetitions": 8},
                {"exercise_id": ids[1], "weight_kg": "20.00", "repetitions": 12},
            ],
        },
    )
    assert created.status_code == 201
    assert [(item["exercise_id"], item["position"]) for item in created.json()["planned_sets"]] == [
        (ids[1], 1), (ids[0], 1), (ids[0], 2)
    ]
    routine_id = created.json()["id"]
    workout_id = client.post(f"/routines/{routine_id}/start", headers=auth).json()["id"]
    copied = client.get(f"/workouts/{workout_id}/exercises", headers=auth).json()
    assert [item["exercise_id"] for item in copied] == [ids[1], ids[0]]
    bench_sets = client.get(
        f"/workouts/{workout_id}/exercises/{copied[1]['id']}/sets", headers=auth
    ).json()
    assert [(item["weight_kg"], item["repetitions"], item["is_completed"]) for item in bench_sets] == [
        ("60.00", 10, False), ("65.50", 8, False)
    ]

    changed = client.put(
        f"/routines/{routine_id}", headers=auth,
        json={"name": "New plan", "exercise_ids": [ids[0]], "planned_sets": [
            {"exercise_id": ids[0], "weight_kg": "70", "repetitions": 5}
        ]},
    )
    assert changed.status_code == 200
    assert len(list(db_session.scalars(select(RoutineSet)))) == 1
    assert client.get(
        f"/workouts/{workout_id}/exercises/{copied[1]['id']}/sets", headers=auth
    ).json() == bench_sets


def test_routine_rejects_invalid_planned_sets(client: TestClient, db_session: Session) -> None:
    auth = headers(client)
    ids = catalog(db_session)
    invalid_sets = [
        [{"exercise_id": ids[1], "weight_kg": None, "repetitions": 10}],
        [{"exercise_id": ids[0], "weight_kg": 60, "repetitions": 0}],
        [{"exercise_id": ids[2], "weight_kg": 60, "repetitions": 10}],
        [{"exercise_id": ids[0], "weight_kg": 60, "repetitions": 10}] * 31,
    ]
    for planned_sets in invalid_sets:
        response = client.post(
            "/routines", headers=auth,
            json={"name": "Bad", "exercise_ids": ids[:2], "planned_sets": planned_sets},
        )
        assert response.status_code == 422
    assert list(db_session.scalars(select(Routine))) == []


def test_deleting_routine_removes_planned_sets(client: TestClient, db_session: Session) -> None:
    auth = headers(client)
    exercise_id = catalog(db_session)[0]
    routine_id = client.post(
        "/routines", headers=auth,
        json={"name": "Plan", "exercise_ids": [exercise_id], "planned_sets": [
            {"exercise_id": exercise_id, "weight_kg": 50, "repetitions": 12}
        ]},
    ).json()["id"]
    assert client.delete(f"/routines/{routine_id}", headers=auth).status_code == 204
    assert list(db_session.scalars(select(RoutineSet))) == []


def test_bodyweight_routine_set_needs_no_weight(
    client: TestClient, db_session: Session
) -> None:
    auth = headers(client)
    exercise = Exercise(name="Pull-Ups", category="back", is_bodyweight=True)
    db_session.add(exercise)
    db_session.commit()
    routine = client.post(
        "/routines", headers=auth,
        json={"name": "Pull day", "exercise_ids": [exercise.id], "planned_sets": [
            {"exercise_id": exercise.id, "weight_kg": None, "repetitions": 8}
        ]},
    )
    assert routine.status_code == 201
    workout_id = client.post(
        f"/routines/{routine.json()['id']}/start", headers=auth
    ).json()["id"]
    item_id = client.get(f"/workouts/{workout_id}/exercises", headers=auth).json()[0]["id"]
    workout_set = client.get(
        f"/workouts/{workout_id}/exercises/{item_id}/sets", headers=auth
    ).json()[0]
    assert workout_set["weight_kg"] is None
    assert workout_set["repetitions"] == 8
    assert workout_set["is_completed"] is False
