"""Tests for the win probability engine — RED first, then implement."""
from __future__ import annotations

import pytest

from app.services.reason_codes import ReasonCodeInfo
from app.services.win_probability import (
    calculate_evidence_strength,
    calculate_win_probability,
    EvidenceStrength,
    WinProbabilityResult,
)


class TestEvidenceStrength:
    """Verify evidence strength scoring against reason code requirements."""

    def test_no_evidence_returns_zero(self):
        reason = ReasonCodeInfo(
            code="10.4",
            network="visa",
            category="fraud",
            description="Other Fraud",
            base_win_rate=0.35,
            required_evidence=["transaction_record", "customer_communication"],
            recommended_evidence=["delivery_confirmation"],
        )
        result = calculate_evidence_strength(reason, available_evidence=[])
        assert result.score == 0.0
        assert len(result.missing_required) == 2
        assert len(result.missing_recommended) == 1

    def test_all_required_evidence_gives_high_score(self):
        reason = ReasonCodeInfo(
            code="10.4",
            network="visa",
            category="fraud",
            description="Other Fraud",
            base_win_rate=0.35,
            required_evidence=["transaction_record", "customer_communication"],
            recommended_evidence=["delivery_confirmation"],
        )
        result = calculate_evidence_strength(
            reason,
            available_evidence=["transaction_record", "customer_communication"],
        )
        assert result.score >= 0.6
        assert len(result.missing_required) == 0
        assert len(result.missing_recommended) == 1

    def test_all_evidence_gives_max_score(self):
        reason = ReasonCodeInfo(
            code="10.4",
            network="visa",
            category="fraud",
            description="Other Fraud",
            base_win_rate=0.35,
            required_evidence=["transaction_record", "customer_communication"],
            recommended_evidence=["delivery_confirmation"],
        )
        result = calculate_evidence_strength(
            reason,
            available_evidence=[
                "transaction_record",
                "customer_communication",
                "delivery_confirmation",
            ],
        )
        assert result.score == 1.0
        assert len(result.missing_required) == 0
        assert len(result.missing_recommended) == 0

    def test_only_recommended_evidence_gives_partial_score(self):
        reason = ReasonCodeInfo(
            code="13.1",
            network="visa",
            category="consumer_dispute",
            description="Merchandise Not Received",
            base_win_rate=0.45,
            required_evidence=["shipping_tracking", "delivery_confirmation"],
            recommended_evidence=["customer_communication", "receipt"],
        )
        result = calculate_evidence_strength(
            reason,
            available_evidence=["customer_communication", "receipt"],
        )
        assert 0.0 < result.score < 0.5
        assert len(result.missing_required) == 2

    def test_score_bounded_zero_to_one(self):
        reason = ReasonCodeInfo(
            code="10.4",
            network="visa",
            category="fraud",
            description="Other Fraud",
            base_win_rate=0.35,
            required_evidence=["transaction_record"],
            recommended_evidence=[],
        )
        result = calculate_evidence_strength(
            reason,
            available_evidence=["transaction_record", "extra_thing", "another_extra"],
        )
        assert 0.0 <= result.score <= 1.0

    def test_evidence_strength_returns_dataclass(self):
        reason = ReasonCodeInfo(
            code="10.4",
            network="visa",
            category="fraud",
            description="Other Fraud",
            base_win_rate=0.35,
            required_evidence=["transaction_record"],
            recommended_evidence=[],
        )
        result = calculate_evidence_strength(
            reason, available_evidence=["transaction_record"]
        )
        assert isinstance(result, EvidenceStrength)
        assert isinstance(result.score, float)
        assert isinstance(result.missing_required, list)
        assert isinstance(result.missing_recommended, list)


class TestWinProbability:
    """Verify win probability calculation combining base rate + evidence."""

    def test_no_evidence_returns_below_base_rate(self):
        result = calculate_win_probability(
            reason_code="10.4", available_evidence=[]
        )
        assert isinstance(result, WinProbabilityResult)
        assert result.probability < 0.35  # below base rate without evidence

    def test_full_evidence_returns_above_base_rate(self):
        result = calculate_win_probability(
            reason_code="10.4",
            available_evidence=[
                "transaction_record",
                "customer_communication",
                "delivery_confirmation",
                "customer_signature",
                "shipping_tracking",
                "receipt",
            ],
        )
        assert result.probability > 0.35  # above base rate with evidence

    def test_probability_bounded_zero_to_one(self):
        result = calculate_win_probability(
            reason_code="10.4",
            available_evidence=[
                "transaction_record",
                "customer_communication",
                "delivery_confirmation",
            ],
        )
        assert 0.0 <= result.probability <= 1.0

    def test_unknown_reason_code_returns_low_probability(self):
        result = calculate_win_probability(
            reason_code="FAKE_CODE", available_evidence=[]
        )
        assert result.probability <= 0.15
        assert "unknown" in result.recommendation.lower() or result.recommendation == "skip"

    def test_result_has_recommendation(self):
        result = calculate_win_probability(
            reason_code="10.4",
            available_evidence=["transaction_record", "customer_communication"],
        )
        assert result.recommendation in ("fight", "skip", "borderline")

    def test_high_probability_recommends_fight(self):
        result = calculate_win_probability(
            reason_code="13.1",
            available_evidence=[
                "shipping_tracking",
                "delivery_confirmation",
                "customer_communication",
                "receipt",
                "customer_signature",
            ],
        )
        assert result.recommendation == "fight"

    def test_low_probability_recommends_skip(self):
        result = calculate_win_probability(
            reason_code="11.2",  # Declined Authorization — 5% base win rate
            available_evidence=[],
        )
        assert result.recommendation == "skip"

    def test_result_has_key_factors(self):
        result = calculate_win_probability(
            reason_code="10.4",
            available_evidence=["transaction_record"],
        )
        assert isinstance(result.key_factors, list)
        assert len(result.key_factors) > 0

    def test_result_has_missing_evidence(self):
        result = calculate_win_probability(
            reason_code="10.4",
            available_evidence=[],
        )
        assert isinstance(result.missing_evidence, list)
        assert len(result.missing_evidence) > 0
