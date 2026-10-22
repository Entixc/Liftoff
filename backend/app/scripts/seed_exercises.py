from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.exercise import Exercise
from app.models.exercise_muscle import ExerciseMuscle
from app.models.muscle import Muscle
from app.scripts.exercise_catalog_data import CATALOG, MUSCLES


def seed_exercises() -> None:
    names = [row[0] for row in CATALOG]
    if len(names) != 70 or len(names) != len(set(names)):
        raise ValueError("Catalog must contain 70 unique exercise names")
    for _, _, _, _, primary, secondary in CATALOG:
        primary_set, secondary_set = set(primary.split()), set(secondary.split())
        if not primary_set or primary_set & secondary_set:
            raise ValueError("Each exercise needs non-overlapping primary and secondary muscles")
        if (primary_set | secondary_set) - MUSCLES.keys():
            raise ValueError("Catalog references an unknown muscle")

    with SessionLocal() as session:
        muscles = {item.slug: item for item in session.scalars(select(Muscle)).all()}
        for slug, name_en in MUSCLES.items():
            if slug not in muscles:
                muscles[slug] = Muscle(slug=slug, name_en=name_en)
                session.add(muscles[slug])
            else:
                muscles[slug].name_en = name_en
        session.flush()

        exercises = {item.name: item for item in session.scalars(select(Exercise)).all()}
        added = 0
        for name, category, is_bodyweight, description, primary, secondary in CATALOG:
            exercise = exercises.get(name)
            if exercise is None:
                exercise = Exercise(name=name, category=category, is_bodyweight=is_bodyweight)
                session.add(exercise)
                added += 1
            exercise.category = category
            exercise.is_bodyweight = is_bodyweight
            exercise.description_en = description
            session.flush()
            existing = {link.muscle_id: link for link in session.scalars(
                select(ExerciseMuscle).where(ExerciseMuscle.exercise_id == exercise.id)
            ).all()}
            desired = {**{slug: "primary" for slug in primary.split()},
                       **{slug: "secondary" for slug in secondary.split()}}
            desired_ids = {muscles[slug].id for slug in desired}
            for muscle_id, link in existing.items():
                if muscle_id not in desired_ids:
                    session.delete(link)
            for slug, role in desired.items():
                muscle_id = muscles[slug].id
                if muscle_id in existing:
                    existing[muscle_id].role = role
                else:
                    session.add(ExerciseMuscle(exercise_id=exercise.id, muscle_id=muscle_id, role=role))
        session.commit()
    print(f"Added {added} exercises; catalog has {len(CATALOG)} entries")


if __name__ == "__main__":
    seed_exercises()
