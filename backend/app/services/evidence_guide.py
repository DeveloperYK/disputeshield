"""Evidence guidance engine.

Provides human-readable guidance for each evidence type:
what it is, where to find it, and why it matters for specific reason codes.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from app.services.reason_codes import get_reason_code_info


@dataclass(frozen=True)
class EvidenceGuidanceItem:
    evidence_type: str
    label: str
    description: str
    where_to_find: str
    why_it_matters: str
    priority: str  # "required" | "recommended" | "optional"
    collected: bool
    accepts_file: bool


# Human-readable guidance for each evidence type
_EVIDENCE_TIPS: dict[str, dict[str, str]] = {
    "transaction_record": {
        "label": "Transaction Record",
        "description": "Proof that the transaction was legitimate — charge details, timestamps, payment method.",
        "where_to_find": "Your Stripe dashboard → Payments → find the charge. We auto-pull this if you connect Stripe.",
        "accepts_file": "false",
    },
    "customer_communication": {
        "label": "Customer Communication",
        "description": "Emails, chat logs, or messages between you and the customer about this order.",
        "where_to_find": "Check your email inbox, helpdesk (Zendesk, Freshdesk), or Shopify inbox for messages from this customer.",
        "accepts_file": "true",
    },
    "shipping_tracking": {
        "label": "Shipping Tracking",
        "description": "Tracking number and carrier info showing the item was shipped.",
        "where_to_find": "Your shipping provider (FedEx, UPS, USPS, DHL) or your Shopify/WooCommerce order page.",
        "accepts_file": "false",
    },
    "delivery_confirmation": {
        "label": "Delivery Confirmation",
        "description": "Proof the item was delivered to the correct address — carrier delivery scan or signed receipt.",
        "where_to_find": "Track your package on the carrier's website. Look for 'Delivered' status with date and address.",
        "accepts_file": "true",
    },
    "refund_policy": {
        "label": "Refund Policy",
        "description": "Your store's refund/return policy that the customer agreed to at checkout.",
        "where_to_find": "Your website's Terms of Service or Refund Policy page. Take a screenshot or export as PDF.",
        "accepts_file": "true",
    },
    "customer_signature": {
        "label": "Customer Signature",
        "description": "A signed delivery receipt or contract showing the customer accepted the goods/service.",
        "where_to_find": "Delivery driver's proof-of-delivery record, or any contract the customer signed.",
        "accepts_file": "true",
    },
    "receipt": {
        "label": "Receipt",
        "description": "Order confirmation or payment receipt sent to the customer.",
        "where_to_find": "Your Stripe dashboard has auto-generated receipts, or check your order management system.",
        "accepts_file": "true",
    },
    "screenshot": {
        "label": "Screenshot",
        "description": "Screenshots of relevant pages — order details, customer account activity, IP logs.",
        "where_to_find": "Take screenshots from your admin dashboard showing the order, customer login history, or IP match.",
        "accepts_file": "true",
    },
    "email_thread": {
        "label": "Email Thread",
        "description": "Full email conversation with the customer about this transaction.",
        "where_to_find": "Search your email for the customer's address. Export the full thread as PDF or screenshot it.",
        "accepts_file": "true",
    },
    "custom_document": {
        "label": "Custom Document",
        "description": "Any other supporting document not covered by the types above.",
        "where_to_find": "Contracts, invoices, service logs, or any document that supports your case.",
        "accepts_file": "true",
    },
}

# Why each evidence type matters, keyed by reason category
_WHY_BY_CATEGORY: dict[str, dict[str, str]] = {
    "fraud": {
        "transaction_record": "Shows the charge was processed normally with valid payment details.",
        "customer_communication": "Proves the real cardholder interacted with your business.",
        "shipping_tracking": "Links the shipment to the cardholder's verified address.",
        "delivery_confirmation": "Proves the item reached the cardholder, undermining fraud claims.",
        "receipt": "Shows the customer received a confirmation — harder to claim they didn't authorize it.",
        "screenshot": "IP address or device fingerprint matching the cardholder strengthens your case.",
    },
    "product_not_received": {
        "shipping_tracking": "Critical — proves you actually shipped the item.",
        "delivery_confirmation": "This is the single most important piece of evidence. Without it, you'll almost certainly lose.",
        "customer_communication": "Shows you communicated shipping/delivery info to the customer.",
        "receipt": "Confirms what was ordered and the delivery address.",
    },
    "subscription_cancellation": {
        "refund_policy": "Shows the customer agreed to your cancellation terms at signup.",
        "customer_communication": "Proves when the customer requested cancellation vs when you processed it.",
        "transaction_record": "Shows the billing cycle and that the charge was within the agreed terms.",
        "receipt": "Confirms the subscription terms the customer agreed to.",
    },
    "product_quality": {
        "customer_communication": "Shows you offered a resolution (refund, replacement) before the chargeback.",
        "refund_policy": "Proves the customer had a return process available but bypassed it.",
        "receipt": "Confirms what was ordered matches what was delivered.",
        "delivery_confirmation": "Proves the customer received the exact item they ordered.",
    },
    "duplicate": {
        "transaction_record": "Shows each charge was for a separate order or service.",
        "receipt": "Proves each transaction had a unique order number and different items/dates.",
        "customer_communication": "Shows the customer acknowledged multiple purchases.",
    },
    "general": {
        "transaction_record": "Establishes the basic facts of the transaction.",
        "customer_communication": "Any interaction that shows the customer was aware of the charge.",
        "receipt": "Confirms the purchase details.",
    },
}


def _get_category_for_reason(reason_code: Optional[str], stripe_reason: str) -> str:
    """Map a reason code or Stripe reason to an evidence category."""
    if reason_code:
        info = get_reason_code_info(reason_code)
        if info:
            cat = info.category.lower()
            if "fraud" in cat:
                return "fraud"
            if "not received" in cat or "not_received" in cat:
                return "product_not_received"
            if "cancel" in cat or "subscription" in cat or "recurring" in cat:
                return "subscription_cancellation"
            if "quality" in cat or "not as described" in cat or "unacceptable" in cat:
                return "product_quality"
            if "duplicate" in cat:
                return "duplicate"

    reason_map = {
        "fraudulent": "fraud",
        "product_not_received": "product_not_received",
        "subscription_canceled": "subscription_cancellation",
        "product_unacceptable": "product_quality",
        "duplicate": "duplicate",
        "unrecognized": "fraud",
    }
    return reason_map.get(stripe_reason, "general")


def build_evidence_guide(
    reason_code: Optional[str],
    stripe_reason: str,
    collected_types: list[str],
) -> list[EvidenceGuidanceItem]:
    """Build a guided evidence checklist for a dispute.

    Returns a list of evidence items ordered by priority (required first),
    with human-readable guidance for each.
    """
    reason_info = get_reason_code_info(reason_code) if reason_code else None
    category = _get_category_for_reason(reason_code, stripe_reason)
    why_map = _WHY_BY_CATEGORY.get(category, _WHY_BY_CATEGORY["general"])

    required = set(reason_info.required_evidence) if reason_info else set()
    recommended = set(reason_info.recommended_evidence) if reason_info else set()
    collected = set(collected_types)

    items: list[EvidenceGuidanceItem] = []

    # Required evidence first
    for ev_type in _EVIDENCE_TIPS:
        if ev_type not in required:
            continue
        tip = _EVIDENCE_TIPS[ev_type]
        items.append(EvidenceGuidanceItem(
            evidence_type=ev_type,
            label=tip["label"],
            description=tip["description"],
            where_to_find=tip["where_to_find"],
            why_it_matters=why_map.get(ev_type, "Strengthens your case with additional documentation."),
            priority="required",
            collected=ev_type in collected,
            accepts_file=tip["accepts_file"] == "true",
        ))

    # Recommended evidence second
    for ev_type in _EVIDENCE_TIPS:
        if ev_type not in recommended or ev_type in required:
            continue
        tip = _EVIDENCE_TIPS[ev_type]
        items.append(EvidenceGuidanceItem(
            evidence_type=ev_type,
            label=tip["label"],
            description=tip["description"],
            where_to_find=tip["where_to_find"],
            why_it_matters=why_map.get(ev_type, "Additional supporting evidence improves your chances."),
            priority="recommended",
            collected=ev_type in collected,
            accepts_file=tip["accepts_file"] == "true",
        ))

    return items
