"""JobHistory model — denormalised completed work log, powers Brain 2 recall queries."""

import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class JobHistory(Base):
    __tablename__ = "job_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    worker_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workers.id"), nullable=False)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    client_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    location: Mapped[str] = mapped_column(String(500), default="")
    latitude: Mapped[float] = mapped_column(Float, nullable=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    employer_feedback: Mapped[str] = mapped_column(Text, default="")
    worker_notes: Mapped[str] = mapped_column(Text, default="")
    payment_amount: Mapped[float] = mapped_column(Float, default=0.0)
