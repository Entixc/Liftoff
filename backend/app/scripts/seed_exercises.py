from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.exercise import Exercise


INITIAL_EXERCISES: list[dict[str, str | bool]] = [
    {
        "name": "Barbell Bench Press",
        "category": "chest",
        "is_bodyweight": False,
    },
    {
        "name": "Dumbbell Bench Press",
        "category": "chest",
        "is_bodyweight": False,
    },
    {
        "name": "Push-Ups",
        "category": "chest",
        "is_bodyweight": True,
    },
    {
        "name": "Dips",
        "category": "chest",
        "is_bodyweight": True,
    },
    {
        "name": "French Press",
        "category": "arms",
        "is_bodyweight": False,
    },
    {
        "name": "Pull-Ups",
        "category": "back",
        "is_bodyweight": True,
    },
    {
        "name": "Lat Pulldown",
        "category": "back",
        "is_bodyweight": False,
    },
    {
        "name": "Barbell Bent-Over Row",
        "category": "back",
        "is_bodyweight": False,
    },
    {
        "name": "Seated Cable Row",
        "category": "back",
        "is_bodyweight": False,
    },
    {
        "name": "Barbell Curl",
        "category": "arms",
        "is_bodyweight": False,
    },
    {
        "name": "Barbell Back Squat",
        "category": "legs",
        "is_bodyweight": False,
    },
    {
        "name": "Leg Press",
        "category": "legs",
        "is_bodyweight": False,
    },
    {
        "name": "Lunges",
        "category": "legs",
        "is_bodyweight": True,
    },
    {
        "name": "Romanian Deadlift",
        "category": "legs",
        "is_bodyweight": False,
    },
    {
        "name": "Calf Raise",
        "category": "legs",
        "is_bodyweight": False,
    },
    {
        "name": "Dumbbell Shoulder Press",
        "category": "shoulders",
        "is_bodyweight": False,
    },
    {
        "name": "Dumbbell Lateral Raise",
        "category": "shoulders",
        "is_bodyweight": False,
    },
    {
        "name": "Barbell Upright Row",
        "category": "shoulders",
        "is_bodyweight": False,
    },
    {
        "name": "Plank",
        "category": "core",
        "is_bodyweight": True,
    },
    {
        "name": "Crunches",
        "category": "core",
        "is_bodyweight": True,
    },
]

def seed_exercises() -> None:
    with SessionLocal() as session:
        existing_names = set(
            session.scalars(select(Exercise.name)).all()
        )

        new_exercises = [
            Exercise(**exercise_data)
            for exercise_data in INITIAL_EXERCISES
            if exercise_data["name"] not in existing_names
        ]

        session.add_all(new_exercises)
        session.commit()

    print(f"Added {len(new_exercises)} exercises")


if __name__ == "__main__":
    seed_exercises()