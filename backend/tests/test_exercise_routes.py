from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.exercise import Exercise


def test_list_exercises_returns_sorted_catalog(
    client: TestClient,
    db_session: Session,
) -> None:
    db_session.add_all(
        [
            Exercise(
                name="Zeta Press",
                category="chest",
                is_bodyweight=False,
            ),
            Exercise(
                name="Alpha Curl",
                category="arms",
                is_bodyweight=False,
            ),
        ]
    )
    db_session.commit()

    response = client.get("/exercises")

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": 2,
            "name": "Alpha Curl",
            "category": "arms",
            "is_bodyweight": False,
        },
        {
            "id": 1,
            "name": "Zeta Press",
            "category": "chest",
            "is_bodyweight": False,
        },
    ]
