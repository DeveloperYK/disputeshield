"""Tests for the analysis engine — RED first, then implement."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.analysis_engine import (
    analyze_dispute,
    build_analysis_prompt,
    AnalysisInput,
    AnalysisResult,
)


class TestAnalysisInput:
    """Verify the input data structure for analysis."""

    def test_create_analysis_input(self):
        inp = AnalysisInput(
            reason_code="10.4",
            network="visa",
            amount_cents=5000,
            currency="usd",
            available_evidence=["transaction_record"],
            customer_email="test@example.com",
        )
        assert inp.reason_code == "10.4"
        assert inp.amount_cents == 5000
        assert inp.customer_email == "test@example.com"

    def test_analysis_input_defaults(self):
        inp = AnalysisInput(
            reason_code="10.4",
            network="visa",
            amount_cents=1000,
            currency="usd",
            available_evidence=[],
        )
        assert inp.customer_email is None
        assert inp.customer_name is None


class TestBuildAnalysisPrompt:
    """Verify prompt construction for the AI analysis."""

    def test_prompt_contains_reason_code(self):
        inp = AnalysisInput(
            reason_code="10.4",
            network="visa",
            amount_cents=5000,
            currency="usd",
            available_evidence=["transaction_record"],
        )
        prompt = build_analysis_prompt(inp, probability=0.55, key_factors=["test"])
        assert "10.4" in prompt
        assert "visa" in prompt

    def test_prompt_contains_amount(self):
        inp = AnalysisInput(
            reason_code="10.4",
            network="visa",
            amount_cents=15000,
            currency="usd",
            available_evidence=[],
        )
        prompt = build_analysis_prompt(inp, probability=0.30, key_factors=[])
        assert "150.00" in prompt or "15000" in prompt

    def test_prompt_contains_evidence_list(self):
        inp = AnalysisInput(
            reason_code="13.1",
            network="visa",
            amount_cents=3000,
            currency="usd",
            available_evidence=["shipping_tracking", "delivery_confirmation"],
        )
        prompt = build_analysis_prompt(inp, probability=0.65, key_factors=[])
        assert "shipping_tracking" in prompt
        assert "delivery_confirmation" in prompt

    def test_prompt_contains_probability(self):
        inp = AnalysisInput(
            reason_code="10.4",
            network="visa",
            amount_cents=5000,
            currency="usd",
            available_evidence=[],
        )
        prompt = build_analysis_prompt(inp, probability=0.42, key_factors=[])
        assert "42%" in prompt or "0.42" in prompt


class TestAnalyzeDispute:
    """Verify the full analysis pipeline (AI call mocked)."""

    @pytest.mark.asyncio
    async def test_analyze_returns_result(self):
        mock_response = (
            "Based on the evidence, this dispute has a moderate chance of winning. "
            "The merchant should gather delivery confirmation to strengthen the case."
        )
        inp = AnalysisInput(
            reason_code="10.4",
            network="visa",
            amount_cents=5000,
            currency="usd",
            available_evidence=["transaction_record", "customer_communication"],
        )
        with patch(
            "app.services.analysis_engine._call_claude",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await analyze_dispute(inp)

        assert isinstance(result, AnalysisResult)
        assert 0.0 <= result.win_probability <= 1.0
        assert result.recommendation in ("fight", "skip", "borderline")
        assert isinstance(result.explanation, str)
        assert len(result.explanation) > 0
        assert isinstance(result.key_factors, list)
        assert isinstance(result.missing_evidence, list)

    @pytest.mark.asyncio
    async def test_analyze_unknown_code_still_works(self):
        mock_response = "Unknown reason code. Limited data available for analysis."
        inp = AnalysisInput(
            reason_code="UNKNOWN",
            network="visa",
            amount_cents=2000,
            currency="usd",
            available_evidence=[],
        )
        with patch(
            "app.services.analysis_engine._call_claude",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await analyze_dispute(inp)

        assert isinstance(result, AnalysisResult)
        assert result.recommendation == "skip"

    @pytest.mark.asyncio
    async def test_analyze_includes_ai_explanation(self):
        ai_text = "The merchant has strong delivery proof which significantly improves odds."
        inp = AnalysisInput(
            reason_code="13.1",
            network="visa",
            amount_cents=8000,
            currency="usd",
            available_evidence=[
                "shipping_tracking",
                "delivery_confirmation",
                "customer_communication",
            ],
        )
        with patch(
            "app.services.analysis_engine._call_claude",
            new_callable=AsyncMock,
            return_value=ai_text,
        ):
            result = await analyze_dispute(inp)

        assert ai_text in result.explanation
