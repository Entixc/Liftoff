from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RoutineSet(Base):
    __tablename__ = "routine_sets"
    __table_args__ = (
        CheckConstraint("repetitions > 0", name="check_routine_sets_repetitions"),
        CheckConstraint(
            "weight_kg IS NULL OR (weight_kg > 0 AND weight_kg < 1000)",
            name="check_routine_sets_weight_kg",
        ),
        CheckConstraint("position > 0", name="check_routine_sets_position"),
        UniqueConstraint(
            "routine_exercise_id", "position", name="uq_routine_sets_position"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    routine_exercise_id: Mapped[int] = mapped_column(
        ForeignKey("routine_exercises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    repetitions: Mapped[int] = mapped_column(Integer, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
