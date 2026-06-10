"""Allocation model — one per job, stores reasoning trace and scores."""

import uuid
from datetime import datetime
from sqlalchemy import Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class Allocation(Base):
    __tablename__ = "allocations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    worker_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workers.id"), nullable=False)
    skill_score: Mapped[float] = mapped_column(Float, nullable=False)
    reliability_score: Mapped[float] = mapped_column(Float, nullable=False)
    distance_score: Mapped[float] = mapped_column(Float, nullable=False)
    fairness_score: Mapped[float] = mapped_column(Float, nullable=False)
    composite_score: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    reasoning_trace: Mapped[dict] = mapped_column(JSON, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
