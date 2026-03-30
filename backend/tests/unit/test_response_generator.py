"""Tests for the AI response generator — RED first, then implement."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.response_generator import (
    build_response_prompt,
    generate_representment_letter,
    ResponseInput,
    RepresentmentLetter,
)


class TestResponseInput:
    def test_create_response_input(self):
        inp = ResponseInput(
            reason_code="10.4",
            network="visa",
            amount_cents=5000,
            currency="usd",
            evidence_summaries=[
                {"type": "transaction_record", "title": "Stripe charge ch_123"},
                {"type": "delivery_confirmation", "title": "FedEx tracking"},
            ],
            customer_email="buyer@example.com",
            customer_name="Jane Doe",
            merchant_name="Acme Store",
        )
        assert inp.reason_code == "10.4"
        assert len(inp.evidence_summaries) == 2
        assert inp.merchant_name == "Acme Store"

    def test_response_input_defaults(self):
        inp = ResponseInput(
            reason_code="10.4",
            network="visa",
            amount_cents=1000,
            currency="usd",
            evidence_summaries=[],
        )
        assert inp.customer_email is None
        assert inp.customer_name is None
        assert inp.merchant_name is None


class TestBuildResponsePrompt:
    def test_prompt_contains_reason_code_and_network(self):
        inp = ResponseInput(
            reason_code="13.1",
            network="visa",
            amount_cents=7500,
            currency="usd",
            evidence_summaries=[{"type": "shipping_tracking", "title": "UPS 1Z999"}],
            merchant_name="Widget Co",
        )
        prompt = build_response_prompt(inp)
        assert "13.1" in prompt
        assert "visa" in prompt
        assert "Widget Co" in prompt

    def test_prompt_contains_evidence_details(self):
        inp = ResponseInput(
            reason_code="10.4",
            network="visa",
            amount_cents=5000,
            currency="usd",
            evidence_summaries=[
                {"type": "transaction_record", "title": "Charge record"},
                {"type": "customer_communication", "title": "Email thread"},
            ],
        )
        prompt = build_response_prompt(inp)
        assert "transaction_record" in prompt
        assert "customer_communication" in prompt

    def test_prompt_includes_amount(self):
        inp = ResponseInput(
            reason_code="10.4",
            network="visa",
            amount_cents=25000,
            currency="usd",
            evidence_summaries=[],
        )
        prompt = build_response_prompt(inp)
        assert "250.00" in prompt or "25000" in prompt


class TestGenerateRepresentmentLetter:
    @pytest.mark.asyncio
    async def test_generate_returns_letter(self):
        mock_letter = (
            "Dear Dispute Resolution Team,\n\n"
            "We are writing to contest dispute case regarding a charge of $50.00. "
            "The transaction was legitimate and authorized by the cardholder.\n\n"
            "Evidence enclosed:\n"
            "1. Transaction record from Stripe\n"
            "2. Delivery confirmation from FedEx\n\n"
            "We respectfully request this dispute be resolved in our favor.\n\n"
            "Sincerely,\nAcme Store"
        )
        inp = ResponseInput(
            reason_code="10.4",
            network="visa",
            amount_cents=5000,
            currency="usd",
            evidence_summaries=[
                {"type": "transaction_record", "title": "Stripe charge"},
                {"type": "delivery_confirmation", "title": "FedEx proof"},
            ],
            merchant_name="Acme Store",
        )
        with patch(
            "app.services.response_generator._call_claude",
            new_callable=AsyncMock,
            return_value=mock_letter,
        ):
            result = await generate_representment_letter(inp)

        assert isinstance(result, RepresentmentLetter)
        assert isinstance(result.letter_text, str)
        assert len(result.letter_text) > 0
        assert result.reason_code == "10.4"
        assert result.network == "visa"

    @pytest.mark.asyncio
    async def test_generate_preserves_ai_text(self):
        ai_text = "This is the AI-generated representment letter content."
        inp = ResponseInput(
            reason_code="4837",
            network="mastercard",
            amount_cents=3000,
            currency="usd",
            evidence_summaries=[],
        )
        with patch(
            "app.services.response_generator._call_claude",
            new_callable=AsyncMock,
            return_value=ai_text,
        ):
            result = await generate_representment_letter(inp)

        assert ai_text in result.letter_text

    @pytest.mark.asyncio
    async def test_generate_includes_evidence_types_used(self):
        inp = ResponseInput(
            reason_code="13.1",
            network="visa",
            amount_cents=9000,
            currency="usd",
            evidence_summaries=[
                {"type": "shipping_tracking", "title": "UPS tracking"},
                {"type": "delivery_confirmation", "title": "Signed receipt"},
            ],
        )
        with patch(
            "app.services.response_generator._call_claude",
            new_callable=AsyncMock,
            return_value="Letter text here.",
        ):
            result = await generate_representment_letter(inp)

        assert result.evidence_types_referenced == [
            "shipping_tracking",
            "delivery_confirmation",
        ]
