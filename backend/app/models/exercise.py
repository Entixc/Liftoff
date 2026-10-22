from sqlalchemy import Boolean, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Exercise(Base):
    __tablename__ = "exercises"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    description_en: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    is_bodyweight: Mapped[bool] = mapped_column(
    Boolean,
    nullable=False,
    default=False,
    server_default=text("false"),
)
