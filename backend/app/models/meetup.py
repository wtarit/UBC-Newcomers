import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Meetup(Base):
    __tablename__ = "meetups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    joiner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    landmark_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("landmarks.id"))
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, accepted, completed, cancelled
    scheduled_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    creator = relationship("User", foreign_keys=[creator_id], lazy="selectin")
    joiner = relationship("User", foreign_keys=[joiner_id], lazy="selectin")
    landmark = relationship("Landmark", lazy="selectin")
