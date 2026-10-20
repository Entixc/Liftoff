from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Integer,
    Numeric,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WorkoutSet(Base):
    __tablename__ = "sets"
    __table_args__ = (
        CheckConstraint(
            "repetitions > 0",
            name="check_sets_repetitions",
        ),
        CheckConstraint(
            "weight_kg IS NULL OR (weight_kg > 0 AND weight_kg < 1000)",
            name="check_sets_weight_kg",
        ),
        CheckConstraint(
            "position > 0",
            name="check_sets_position",
        ),
        UniqueConstraint(
            "workout_exercise_id",
            "position",
            name="uq_sets_workout_exercise_position",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    workout_exercise_id: Mapped[int] = mapped_column(
        ForeignKey("workout_exercises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    weight_kg: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2),
        nullable=True,
    )
    repetitions: Mapped[int] = mapped_column(Integer, nullable=False)
    is_completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
