import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.dispute import Dispute


class EvidenceType(str, PyEnum):
    TRANSACTION_RECORD = "transaction_record"
    CUSTOMER_COMMUNICATION = "customer_communication"
    SHIPPING_TRACKING = "shipping_tracking"
    DELIVERY_CONFIRMATION = "delivery_confirmation"
    REFUND_POLICY = "refund_policy"
    CUSTOMER_SIGNATURE = "customer_signature"
    RECEIPT = "receipt"
    SCREENSHOT = "screenshot"
    EMAIL_THREAD = "email_thread"
    CUSTOM_DOCUMENT = "custom_document"


class EvidenceSource(str, PyEnum):
    STRIPE_AUTO = "stripe_auto"
    MERCHANT_UPLOAD = "merchant_upload"


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    dispute_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("disputes.id"), nullable=False, index=True
    )

    evidence_type: Mapped[EvidenceType] = mapped_column(
        Enum(EvidenceType), nullable=False
    )
    source: Mapped[EvidenceSource] = mapped_column(
        Enum(EvidenceSource), nullable=False
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    content: Mapped[Optional[str]] = mapped_column(Text)
    file_url: Mapped[Optional[str]] = mapped_column(Text)
    stripe_file_id: Mapped[Optional[str]] = mapped_column(String(255))
    file_name: Mapped[Optional[str]] = mapped_column(String(255))
    file_size: Mapped[Optional[int]] = mapped_column()

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    dispute: Mapped["Dispute"] = relationship(back_populates="evidence_items")
