from __future__ import annotations

import json
from datetime import datetime, timezone

import stripe
from sqlalchemy.orm import Session

from app.config import settings
from app.models.dispute import Dispute, DisputeStatus
from app.models.evidence import Evidence, EvidenceSource, EvidenceType
from app.models.user import User
from app.services.reason_codes import map_stripe_reason_to_code

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

    # Map Stripe reason string to our reason code database
    stripe_reason = dispute_data["reason"]
    reason_code_info = map_stripe_reason_to_code(stripe_reason)
    mapped_reason_code = reason_code_info.code if reason_code_info else None
    mapped_network = reason_code_info.network if reason_code_info else dispute_data.get("payment_method_details", {}).get("type")

    dispute_values = {
        "stripe_charge_id": charge if isinstance(charge, str) else charge.get("id", ""),
        "stripe_payment_intent_id": payment_intent if isinstance(payment_intent, str) else None,
        "amount": dispute_data["amount"],
        "currency": dispute_data["currency"],
        "reason": stripe_reason,
        "reason_code": mapped_reason_code,
        "network": mapped_network,
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
    # Deduplication: skip if we already auto-pulled for this dispute.
    existing_auto = (
        db.query(Evidence)
        .filter(
            Evidence.dispute_id == dispute.id,
            Evidence.source == EvidenceSource.STRIPE_AUTO,
        )
        .all()
    )
    if existing_auto:
        return existing_auto

    evidence_items = []

    try:
        charge_obj = stripe.Charge.retrieve(
            dispute.stripe_charge_id,
            api_key=access_token,
        )
        # Convert StripeObject to plain dict — StripeObject doesn't
        # support .get() which breaks downstream code.
        charge = charge_obj.to_dict() if hasattr(charge_obj, "to_dict") else dict(charge_obj)
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


# Mapping from our EvidenceType to Stripe's dispute evidence field names
# See: https://docs.stripe.com/api/disputes/update
_EVIDENCE_TYPE_TO_STRIPE_FIELD: dict[str, str] = {
    "transaction_record": "uncategorized_text",
    "customer_communication": "customer_communication",
    "shipping_tracking": "shipping_tracking_number",
    "delivery_confirmation": "shipping_documentation",
    "refund_policy": "refund_policy",
    "customer_signature": "customer_signature",
    "receipt": "receipt",
    "screenshot": "uncategorized_file",
    "email_thread": "customer_communication",
    "custom_document": "uncategorized_text",
}


def submit_evidence_to_stripe(
    dispute: Dispute,
    evidence_items: list[Evidence],
    generated_response: str | None,
    access_token: str,
) -> dict:
    """Submit compiled evidence to Stripe for a dispute.

    Calls stripe.Dispute.modify() with the evidence dict, then submits it.
    Returns the updated Stripe dispute object.
    """
    evidence_payload: dict[str, str] = {}

    # Add the generated representment letter as uncategorized_text
    if generated_response:
        evidence_payload["uncategorized_text"] = generated_response

    # Stripe fields that accept file IDs (not text)
    _FILE_FIELDS = {"receipt", "shipping_documentation", "customer_signature", "uncategorized_file"}

    # Map evidence items to Stripe fields
    for item in evidence_items:
        stripe_field = _EVIDENCE_TYPE_TO_STRIPE_FIELD.get(
            item.evidence_type.value, "uncategorized_text"
        )

        # Use stripe_file_id for file-type fields
        if item.stripe_file_id and stripe_field in _FILE_FIELDS:
            evidence_payload[stripe_field] = item.stripe_file_id
        elif item.content:
            # Text fields: concatenate if multiple items map to the same field
            existing = evidence_payload.get(stripe_field, "")
            separator = "\n\n---\n\n" if existing else ""
            evidence_payload[stripe_field] = existing + separator + item.content

    # Add customer info if available
    if dispute.customer_email:
        evidence_payload["customer_email_address"] = dispute.customer_email
    if dispute.customer_name:
        evidence_payload["customer_name"] = dispute.customer_name

    # Submit evidence to Stripe
    updated_dispute = stripe.Dispute.modify(
        dispute.stripe_dispute_id,
        evidence=evidence_payload,
        submit=True,
        api_key=access_token,
    )

    return dict(updated_dispute)


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
