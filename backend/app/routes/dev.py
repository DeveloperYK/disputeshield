"""Dev-only routes for testing. Guarded by DEBUG=true."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.dispute import Dispute, DisputeStatus
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.dispute import DisputeResponse
from app.services.reason_codes import get_reason_description, get_reason_label, map_stripe_reason_to_code

router = APIRouter(prefix="/dev", tags=["dev"])


@router.post("/seed-dispute", response_model=DisputeResponse)
def seed_test_dispute(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a fake test dispute for the current user. Only works in debug mode."""
    if not settings.debug:
        raise HTTPException(status_code=403, detail="Dev routes disabled in production")

    import random
    stripe_reasons = [
        "fraudulent", "product_not_received", "duplicate",
        "subscription_canceled", "product_unacceptable",
    ]
    stripe_reason = random.choice(stripe_reasons)
    reason_info = map_stripe_reason_to_code(stripe_reason)

    amount = random.randint(2500, 150000)  # $25 - $1500 in cents
    now = datetime.now(timezone.utc)

    dispute = Dispute(
        user_id=current_user.id,
        stripe_dispute_id=f"dp_test_{random.randint(100000, 999999)}",
        stripe_charge_id=f"ch_test_{random.randint(100000, 999999)}",
        stripe_payment_intent_id=f"pi_test_{random.randint(100000, 999999)}",
        amount=amount,
        currency="usd",
        reason=stripe_reason,
        reason_code=reason_info.code if reason_info else None,
        network=reason_info.network if reason_info else "visa",
        status=DisputeStatus.NEEDS_RESPONSE,
        customer_email=f"customer{random.randint(100, 999)}@example.com",
        customer_name=random.choice([
            "Alex Johnson", "Maria Garcia", "Sam Patel",
            "Jordan Lee", "Taylor Smith", "Casey Brown",
        ]),
        dispute_created_at=now,
        evidence_due_by=now + timedelta(days=random.randint(5, 25)),
    )
    db.add(dispute)
    db.commit()
    db.refresh(dispute)
    resp = DisputeResponse.model_validate(dispute)
    resp.reason_label = get_reason_label(dispute.reason_code, dispute.reason)
    resp.reason_description = get_reason_description(dispute.reason_code, dispute.reason)
    return resp
