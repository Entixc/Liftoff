from sqlalchemy import CheckConstraint, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RoutineExercise(Base):
    __tablename__ = "routine_exercises"
    __table_args__ = (
        CheckConstraint("position > 0", name="check_routine_exercises_position"),
        UniqueConstraint(
            "routine_id", "exercise_id", name="uq_routine_exercises_exercise"
        ),
        UniqueConstraint(
            "routine_id", "position", name="uq_routine_exercises_position"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    routine_id: Mapped[int] = mapped_column(
        ForeignKey("routines.id", ondelete="CASCADE"), nullable=False, index=True
    )
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
