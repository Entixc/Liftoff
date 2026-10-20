from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"
    __table_args__ = (
        CheckConstraint(
            "position > 0",
            name="check_workout_exercises_position",
        ),
        UniqueConstraint(
            "workout_id",
            "exercise_id",
            name="uq_workout_exercises_workout_exercise",
        ),
        UniqueConstraint(
            "workout_id",
            "position",
            name="uq_workout_exercises_workout_position",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    workout_id: Mapped[int] = mapped_column(
        ForeignKey("workouts.id"),
        nullable=False,
        index=True,
    )
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id"),
        nullable=False,
        index=True,
    )
    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )