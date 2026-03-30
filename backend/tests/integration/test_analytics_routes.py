"""Integration tests for the analytics endpoint."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.models.dispute import Dispute, DisputeStatus


def test_analytics_empty(client, auth_headers):
    response = client.get("/api/analytics", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_disputes"] == 0
    assert data["win_rate"] == 0.0
    assert data["total_recovered_cents"] == 0


def test_analytics_unauthenticated(client):
    response = client.get("/api/analytics")
    assert response.status_code == 401


def test_analytics_with_disputes(client, auth_headers, db, registered_user):
    from app.models.user import User

    user = db.query(User).filter(User.email == "test@example.com").first()
    disputes = [
        Dispute(
            id=uuid.uuid4(),
            user_id=user.id,
            stripe_dispute_id=f"dp_test_{i}",
            stripe_charge_id=f"ch_test_{i}",
            amount=5000,
            currency="usd",
            reason="fraudulent",
            reason_code="10.4",
            network="visa",
            status=status,
            dispute_created_at=datetime.now(timezone.utc),
        )
        for i, status in enumerate(
            [DisputeStatus.WON, DisputeStatus.WON, DisputeStatus.LOST]
        )
    ]
    db.add_all(disputes)
    db.commit()

    response = client.get("/api/analytics", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_disputes"] == 3
    assert data["total_won"] == 2
    assert data["total_lost"] == 1
    assert data["total_recovered_cents"] == 10000
    assert data["total_lost_cents"] == 5000
    assert len(data["reason_code_breakdown"]) == 1
    assert data["reason_code_breakdown"][0]["reason_code"] == "10.4"


def test_analytics_with_skipped(client, auth_headers, db, registered_user):
    from app.models.user import User

    user = db.query(User).filter(User.email == "test@example.com").first()
    dispute = Dispute(
        id=uuid.uuid4(),
        user_id=user.id,
        stripe_dispute_id="dp_skip_1",
        stripe_charge_id="ch_skip_1",
        amount=3000,
        currency="usd",
        reason="fraudulent",
        reason_code="11.2",
        network="visa",
        status=DisputeStatus.SKIPPED,
        dispute_created_at=datetime.now(timezone.utc),
    )
    db.add(dispute)
    db.commit()

    response = client.get("/api/analytics", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_skipped"] == 1
    assert data["money_saved_by_skipping_cents"] == 3000
