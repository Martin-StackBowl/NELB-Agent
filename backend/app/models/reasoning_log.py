"""ReasoningLog model — audit trail of every agent decision."""

import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class ReasoningLog(Base):
    __tablename__ = "reasoning_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # allocate, recall, assist
    input_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    steps: Mapped[dict] = mapped_column(JSON, nullable=False)
    output_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, default="")
    duration_ms: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
