import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.evidence import Evidence
    from app.models.user import User


class DisputeStatus(str, PyEnum):
    NEEDS_RESPONSE = "needs_response"
    UNDER_REVIEW = "under_review"
    RESPONSE_SUBMITTED = "response_submitted"
    WON = "won"
    LOST = "lost"
    SKIPPED = "skipped"


class Dispute(Base):
    __tablename__ = "disputes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Stripe dispute data
    stripe_dispute_id: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    stripe_charge_id: Mapped[str] = mapped_column(String(255), nullable=False)
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String(255))

    # Dispute details
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="usd")
    reason: Mapped[str] = mapped_column(String(100), nullable=False)
    reason_code: Mapped[Optional[str]] = mapped_column(String(50))
    network: Mapped[Optional[str]] = mapped_column(String(50))
    status: Mapped[DisputeStatus] = mapped_column(
        Enum(DisputeStatus), default=DisputeStatus.NEEDS_RESPONSE
    )

    # Customer info
    customer_email: Mapped[Optional[str]] = mapped_column(String(255))
    customer_name: Mapped[Optional[str]] = mapped_column(String(255))

    # Win probability
    win_probability: Mapped[Optional[float]] = mapped_column(Float)
    win_explanation: Mapped[Optional[str]] = mapped_column(Text)

    # AI response
    generated_response: Mapped[Optional[str]] = mapped_column(Text)

    # Timestamps
    dispute_created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    evidence_due_by: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["User"] = relationship(back_populates="disputes")
    evidence_items: Mapped[list["Evidence"]] = relationship(back_populates="dispute")
