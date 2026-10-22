from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ExerciseMuscle(Base):
    __tablename__ = "exercise_muscles"
    __table_args__ = (
        CheckConstraint("role IN ('primary', 'secondary')", name="check_exercise_muscles_role"),
        UniqueConstraint("exercise_id", "muscle_id", name="uq_exercise_muscles_pair"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True)
    muscle_id: Mapped[int] = mapped_column(ForeignKey("muscles.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(12), nullable=False)
