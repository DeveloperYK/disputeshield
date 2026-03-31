"""Tests for deadline checker background job."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.models.dispute import Dispute, DisputeStatus
from app.models.user import User
from app.services.deadline_checker import check_approaching_deadlines


class TestCheckApproachingDeadlines:
    def test_finds_disputes_within_48h(self, db, registered_user):
        user = db.query(User).filter(User.email == "test@example.com").first()

        # Dispute due in 24 hours — should trigger reminder
        urgent = Dispute(
            id=uuid.uuid4(),
            user_id=user.id,
            stripe_dispute_id="dp_urgent",
            stripe_charge_id="ch_urgent",
            amount=5000,
            currency="usd",
            reason="fraudulent",
            status=DisputeStatus.NEEDS_RESPONSE,
            dispute_created_at=datetime.now(timezone.utc),
            evidence_due_by=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        db.add(urgent)
        db.commit()

        with patch(
            "app.services.deadline_checker.send_deadline_reminder",
            return_value=True,
        ) as mock_send:
            sent = check_approaching_deadlines(db)

        assert sent == 1
        mock_send.assert_called_once()
        assert mock_send.call_args.kwargs["to_email"] == "test@example.com"

    def test_ignores_disputes_not_due_soon(self, db, registered_user):
        user = db.query(User).filter(User.email == "test@example.com").first()

        # Dispute due in 10 days — should NOT trigger
        far = Dispute(
            id=uuid.uuid4(),
            user_id=user.id,
            stripe_dispute_id="dp_far",
            stripe_charge_id="ch_far",
            amount=3000,
            currency="usd",
            reason="fraudulent",
            status=DisputeStatus.NEEDS_RESPONSE,
            dispute_created_at=datetime.now(timezone.utc),
            evidence_due_by=datetime.now(timezone.utc) + timedelta(days=10),
        )
        db.add(far)
        db.commit()

        with patch(
            "app.services.deadline_checker.send_deadline_reminder",
            return_value=True,
        ) as mock_send:
            sent = check_approaching_deadlines(db)

        assert sent == 0
        mock_send.assert_not_called()

    def test_ignores_already_responded_disputes(self, db, registered_user):
        user = db.query(User).filter(User.email == "test@example.com").first()

        # Dispute due soon but already submitted
        submitted = Dispute(
            id=uuid.uuid4(),
            user_id=user.id,
            stripe_dispute_id="dp_submitted",
            stripe_charge_id="ch_submitted",
            amount=5000,
            currency="usd",
            reason="fraudulent",
            status=DisputeStatus.RESPONSE_SUBMITTED,
            dispute_created_at=datetime.now(timezone.utc),
            evidence_due_by=datetime.now(timezone.utc) + timedelta(hours=12),
        )
        db.add(submitted)
        db.commit()

        with patch(
            "app.services.deadline_checker.send_deadline_reminder",
            return_value=True,
        ) as mock_send:
            sent = check_approaching_deadlines(db)

        assert sent == 0
        mock_send.assert_not_called()

    def test_ignores_expired_deadlines(self, db, registered_user):
        user = db.query(User).filter(User.email == "test@example.com").first()

        # Dispute already expired
        expired = Dispute(
            id=uuid.uuid4(),
            user_id=user.id,
            stripe_dispute_id="dp_expired",
            stripe_charge_id="ch_expired",
            amount=5000,
            currency="usd",
            reason="fraudulent",
            status=DisputeStatus.NEEDS_RESPONSE,
            dispute_created_at=datetime.now(timezone.utc),
            evidence_due_by=datetime.now(timezone.utc) - timedelta(hours=2),
        )
        db.add(expired)
        db.commit()

        with patch(
            "app.services.deadline_checker.send_deadline_reminder",
            return_value=True,
        ) as mock_send:
            sent = check_approaching_deadlines(db)

        assert sent == 0
        mock_send.assert_not_called()
