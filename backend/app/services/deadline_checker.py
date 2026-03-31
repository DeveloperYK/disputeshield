"""Background job to check for approaching chargeback deadlines and send reminders."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.dispute import Dispute, DisputeStatus
from app.models.user import User
from app.services.email_service import send_deadline_reminder
from app.services.reason_codes import get_reason_label

logger = logging.getLogger(__name__)


def check_approaching_deadlines(db: Session) -> int:
    """Find disputes with deadlines within 48 hours and send reminder emails.

    Returns the number of reminders sent.
    """
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(hours=48)

    disputes = (
        db.query(Dispute)
        .filter(
            Dispute.status == DisputeStatus.NEEDS_RESPONSE,
            Dispute.evidence_due_by.isnot(None),
            Dispute.evidence_due_by > now,
            Dispute.evidence_due_by <= cutoff,
        )
        .all()
    )

    sent = 0
    for dispute in disputes:
        user = db.query(User).filter(User.id == dispute.user_id).first()
        if not user:
            continue

        due = dispute.evidence_due_by
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        hours_left = int((due - now).total_seconds() / 3600)
        reason_label = get_reason_label(dispute.reason_code, dispute.reason)

        success = send_deadline_reminder(
            to_email=user.email,
            business_name=user.business_name or "",
            amount_cents=dispute.amount,
            currency=dispute.currency,
            reason_label=reason_label,
            dispute_id=str(dispute.id),
            hours_left=hours_left,
        )
        if success:
            sent += 1

    logger.info(f"Deadline check complete: {sent}/{len(disputes)} reminders sent")
    return sent
