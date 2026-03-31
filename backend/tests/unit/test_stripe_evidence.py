"""Tests for Stripe evidence submission mapping."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional
from unittest.mock import MagicMock, patch
import uuid

import pytest

from app.models.evidence import EvidenceSource, EvidenceType
from app.services.stripe_service import (
    submit_evidence_to_stripe,
    _EVIDENCE_TYPE_TO_STRIPE_FIELD,
)


@dataclass
class FakeDispute:
    stripe_dispute_id: str = "dp_test_123"
    stripe_charge_id: str = "ch_test_123"
    customer_email: Optional[str] = "buyer@example.com"
    customer_name: Optional[str] = "Jane Doe"


@dataclass
class FakeEvidence:
    evidence_type: EvidenceType = EvidenceType.TRANSACTION_RECORD
    source: EvidenceSource = EvidenceSource.MERCHANT_UPLOAD
    title: str = "Test Evidence"
    description: str = "Test"
    content: Optional[str] = "test content"
    file_url: Optional[str] = None
    stripe_file_id: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None


class TestEvidenceTypeMapping:
    """All our evidence types should map to a Stripe field."""

    def test_all_evidence_types_have_mapping(self):
        for et in EvidenceType:
            assert et.value in _EVIDENCE_TYPE_TO_STRIPE_FIELD, (
                f"EvidenceType.{et.name} missing from Stripe field mapping"
            )


class TestSubmitEvidenceToStripe:
    @patch("app.services.stripe_service.stripe.Dispute.modify")
    def test_submits_generated_response(self, mock_modify):
        mock_modify.return_value = {"id": "dp_test_123", "status": "under_review"}

        submit_evidence_to_stripe(
            dispute=FakeDispute(),
            evidence_items=[],
            generated_response="Dear Visa, here is our evidence...",
            access_token="sk_test_token",
        )

        mock_modify.assert_called_once()
        evidence = mock_modify.call_args.kwargs["evidence"]
        assert "Dear Visa" in evidence["uncategorized_text"]

    @patch("app.services.stripe_service.stripe.Dispute.modify")
    def test_includes_customer_info(self, mock_modify):
        mock_modify.return_value = {"id": "dp_test_123"}

        submit_evidence_to_stripe(
            dispute=FakeDispute(),
            evidence_items=[],
            generated_response="Letter text",
            access_token="sk_test_token",
        )

        evidence = mock_modify.call_args.kwargs["evidence"]
        assert evidence["customer_email_address"] == "buyer@example.com"
        assert evidence["customer_name"] == "Jane Doe"

    @patch("app.services.stripe_service.stripe.Dispute.modify")
    def test_maps_evidence_items(self, mock_modify):
        mock_modify.return_value = {"id": "dp_test_123"}
        ev = FakeEvidence(
            evidence_type=EvidenceType.CUSTOMER_COMMUNICATION,
            content="Customer said they received the item",
        )

        submit_evidence_to_stripe(
            dispute=FakeDispute(),
            evidence_items=[ev],
            generated_response=None,
            access_token="sk_test_token",
        )

        evidence = mock_modify.call_args.kwargs["evidence"]
        assert "customer_communication" in evidence
        assert "Customer said" in evidence["customer_communication"]

    @patch("app.services.stripe_service.stripe.Dispute.modify")
    def test_submits_with_correct_dispute_id(self, mock_modify):
        mock_modify.return_value = {"id": "dp_test_456"}

        submit_evidence_to_stripe(
            dispute=FakeDispute(stripe_dispute_id="dp_test_456"),
            evidence_items=[],
            generated_response="Letter",
            access_token="sk_test_token",
        )

        assert mock_modify.call_args[0][0] == "dp_test_456"
        assert mock_modify.call_args.kwargs["submit"] is True

    @patch("app.services.stripe_service.stripe.Dispute.modify")
    def test_uses_merchant_access_token(self, mock_modify):
        mock_modify.return_value = {"id": "dp_test_123"}

        submit_evidence_to_stripe(
            dispute=FakeDispute(),
            evidence_items=[],
            generated_response="Letter",
            access_token="sk_test_merchant_key",
        )

        assert mock_modify.call_args.kwargs["api_key"] == "sk_test_merchant_key"

    @patch("app.services.stripe_service.stripe.Dispute.modify")
    def test_uses_stripe_file_id_for_receipt(self, mock_modify):
        mock_modify.return_value = {"id": "dp_test_123"}
        ev = FakeEvidence(
            evidence_type=EvidenceType.RECEIPT,
            stripe_file_id="file_abc123",
            content=None,
        )

        submit_evidence_to_stripe(
            dispute=FakeDispute(),
            evidence_items=[ev],
            generated_response=None,
            access_token="sk_test_token",
        )

        evidence = mock_modify.call_args.kwargs["evidence"]
        assert evidence["receipt"] == "file_abc123"

    @patch("app.services.stripe_service.stripe.Dispute.modify")
    def test_uses_stripe_file_id_for_screenshot(self, mock_modify):
        mock_modify.return_value = {"id": "dp_test_123"}
        ev = FakeEvidence(
            evidence_type=EvidenceType.SCREENSHOT,
            stripe_file_id="file_screenshot_456",
            content=None,
        )

        submit_evidence_to_stripe(
            dispute=FakeDispute(),
            evidence_items=[ev],
            generated_response=None,
            access_token="sk_test_token",
        )

        evidence = mock_modify.call_args.kwargs["evidence"]
        assert evidence["uncategorized_file"] == "file_screenshot_456"

    @patch("app.services.stripe_service.stripe.Dispute.modify")
    def test_falls_back_to_content_for_text_fields(self, mock_modify):
        mock_modify.return_value = {"id": "dp_test_123"}
        ev = FakeEvidence(
            evidence_type=EvidenceType.SHIPPING_TRACKING,
            stripe_file_id="file_xyz",
            content="TRACK123456",
        )

        submit_evidence_to_stripe(
            dispute=FakeDispute(),
            evidence_items=[ev],
            generated_response=None,
            access_token="sk_test_token",
        )

        evidence = mock_modify.call_args.kwargs["evidence"]
        # shipping_tracking maps to shipping_tracking_number which is a text field, not a file field
        assert evidence["shipping_tracking_number"] == "TRACK123456"

    @patch("app.services.stripe_service.stripe.Dispute.modify")
    def test_concatenates_multiple_text_items_same_field(self, mock_modify):
        mock_modify.return_value = {"id": "dp_test_123"}
        ev1 = FakeEvidence(
            evidence_type=EvidenceType.CUSTOM_DOCUMENT,
            content="First doc content",
        )
        ev2 = FakeEvidence(
            evidence_type=EvidenceType.CUSTOM_DOCUMENT,
            content="Second doc content",
        )

        submit_evidence_to_stripe(
            dispute=FakeDispute(),
            evidence_items=[ev1, ev2],
            generated_response=None,
            access_token="sk_test_token",
        )

        evidence = mock_modify.call_args.kwargs["evidence"]
        assert "First doc content" in evidence["uncategorized_text"]
        assert "Second doc content" in evidence["uncategorized_text"]
