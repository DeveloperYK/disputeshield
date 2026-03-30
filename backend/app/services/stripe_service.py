from __future__ import annotations

import json
from datetime import datetime, timezone

import stripe
from sqlalchemy.orm import Session

from app.config import settings
from app.models.dispute import Dispute, DisputeStatus
from app.models.evidence import Evidence, EvidenceSource, EvidenceType
from app.models.user import User

stripe.api_key = settings.stripe_api_key


def get_or_create_dispute_from_webhook(
    db: Session, dispute_data: dict, user: User
) -> Dispute:
    """Create or update a dispute record from a Stripe webhook event."""
    existing = (
        db.query(Dispute)
        .filter(Dispute.stripe_dispute_id == dispute_data["id"])
        .first()
    )

    charge = dispute_data.get("charge", "")
    payment_intent = dispute_data.get("payment_intent")
    evidence_details = dispute_data.get("evidence_details", {})
    due_by_ts = evidence_details.get("due_by")

    dispute_values = {
        "stripe_charge_id": charge if isinstance(charge, str) else charge.get("id", ""),
        "stripe_payment_intent_id": payment_intent if isinstance(payment_intent, str) else None,
        "amount": dispute_data["amount"],
        "currency": dispute_data["currency"],
        "reason": dispute_data["reason"],
        "network": dispute_data.get("payment_method_details", {}).get("type"),
        "customer_email": _extract_customer_email(dispute_data),
        "customer_name": _extract_customer_name(dispute_data),
        "dispute_created_at": datetime.fromtimestamp(
            dispute_data["created"], tz=timezone.utc
        ),
        "evidence_due_by": (
            datetime.fromtimestamp(due_by_ts, tz=timezone.utc)
            if due_by_ts
            else None
        ),
    }

    if existing:
        for key, value in dispute_values.items():
            setattr(existing, key, value)
        _update_status_from_stripe(existing, dispute_data)
        db.commit()
        db.refresh(existing)
        return existing

    dispute = Dispute(
        user_id=user.id,
        stripe_dispute_id=dispute_data["id"],
        status=DisputeStatus.NEEDS_RESPONSE,
        **dispute_values,
    )
    db.add(dispute)
    db.commit()
    db.refresh(dispute)
    return dispute


def pull_evidence_from_stripe(
    db: Session, dispute: Dispute, access_token: str
) -> list[Evidence]:
    """Pull available evidence from the Stripe charge and payment intent."""
    evidence_items = []

    try:
        charge = stripe.Charge.retrieve(
            dispute.stripe_charge_id,
            api_key=access_token,
        )
    except stripe.StripeError:
        return evidence_items

    # Transaction record
    transaction_evidence = Evidence(
        dispute_id=dispute.id,
        evidence_type=EvidenceType.TRANSACTION_RECORD,
        source=EvidenceSource.STRIPE_AUTO,
        title="Transaction Record",
        description=f"Charge {charge['id']} for {charge['amount']/100:.2f} {charge['currency'].upper()}",
        content=json.dumps({
            "charge_id": charge["id"],
            "amount": charge["amount"],
            "currency": charge["currency"],
            "created": charge["created"],
            "payment_method": charge.get("payment_method_details", {}).get("type"),
            "billing_details": charge.get("billing_details"),
            "metadata": charge.get("metadata", {}),
        }),
    )
    evidence_items.append(transaction_evidence)

    # Shipping info if available
    shipping = charge.get("shipping")
    if shipping:
        shipping_evidence = Evidence(
            dispute_id=dispute.id,
            evidence_type=EvidenceType.SHIPPING_TRACKING,
            source=EvidenceSource.STRIPE_AUTO,
            title="Shipping Information",
            description="Shipping details from the original charge",
            content=json.dumps(shipping),
        )
        evidence_items.append(shipping_evidence)

    # Receipt URL
    receipt_url = charge.get("receipt_url")
    if receipt_url:
        receipt_evidence = Evidence(
            dispute_id=dispute.id,
            evidence_type=EvidenceType.RECEIPT,
            source=EvidenceSource.STRIPE_AUTO,
            title="Payment Receipt",
            description="Stripe-generated payment receipt",
            file_url=receipt_url,
        )
        evidence_items.append(receipt_evidence)

    for item in evidence_items:
        db.add(item)
    db.commit()

    return evidence_items


def _extract_customer_email(dispute_data: dict) -> str | None:
    evidence = dispute_data.get("evidence", {})
    if evidence and evidence.get("customer_email_address"):
        return evidence["customer_email_address"]
    return None


def _extract_customer_name(dispute_data: dict) -> str | None:
    evidence = dispute_data.get("evidence", {})
    if evidence and evidence.get("customer_name"):
        return evidence["customer_name"]
    return None


def _update_status_from_stripe(dispute: Dispute, dispute_data: dict) -> None:
    stripe_status = dispute_data.get("status", "")
    status_map = {
        "won": DisputeStatus.WON,
        "lost": DisputeStatus.LOST,
        "needs_response": DisputeStatus.NEEDS_RESPONSE,
        "under_review": DisputeStatus.UNDER_REVIEW,
    }
    if stripe_status in status_map:
        dispute.status = status_map[stripe_status]
