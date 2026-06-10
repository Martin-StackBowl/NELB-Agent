"""Worker model — profiles, skills, reliability, location."""

import uuid
from sqlalchemy import String, Float, Boolean, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Worker(Base):
    __tablename__ = "workers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(50), default="")
    skills: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    reliability_score: Mapped[float] = mapped_column(Float, default=100.0)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str] = mapped_column(String(500), default="")
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    auth_user_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)
