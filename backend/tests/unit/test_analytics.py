"""Tests for the analytics service — RED first, then implement."""
from __future__ import annotations

import pytest

from app.services.analytics import (
    compute_analytics,
    AnalyticsInput,
    AnalyticsResult,
    ReasonCodeBreakdown,
)


class TestAnalyticsInput:
    def test_create_input(self):
        inp = AnalyticsInput(
            disputes=[
                {
                    "amount": 5000,
                    "status": "won",
                    "reason_code": "10.4",
                    "recommendation": "fight",
                },
                {
                    "amount": 3000,
                    "status": "lost",
                    "reason_code": "10.4",
                    "recommendation": "fight",
                },
            ]
        )
        assert len(inp.disputes) == 2


class TestComputeAnalytics:
    def test_empty_disputes(self):
        result = compute_analytics(AnalyticsInput(disputes=[]))
        assert isinstance(result, AnalyticsResult)
        assert result.total_disputes == 0
        assert result.total_won == 0
        assert result.total_lost == 0
        assert result.win_rate == 0.0
        assert result.total_recovered_cents == 0
        assert result.total_lost_cents == 0

    def test_all_won(self):
        result = compute_analytics(
            AnalyticsInput(
                disputes=[
                    {"amount": 5000, "status": "won", "reason_code": "10.4", "recommendation": "fight"},
                    {"amount": 3000, "status": "won", "reason_code": "13.1", "recommendation": "fight"},
                ]
            )
        )
        assert result.total_disputes == 2
        assert result.total_won == 2
        assert result.total_lost == 0
        assert result.win_rate == 1.0
        assert result.total_recovered_cents == 8000

    def test_mixed_outcomes(self):
        result = compute_analytics(
            AnalyticsInput(
                disputes=[
                    {"amount": 5000, "status": "won", "reason_code": "10.4", "recommendation": "fight"},
                    {"amount": 3000, "status": "lost", "reason_code": "10.4", "recommendation": "fight"},
                    {"amount": 2000, "status": "won", "reason_code": "13.1", "recommendation": "fight"},
                ]
            )
        )
        assert result.total_disputes == 3
        assert result.total_won == 2
        assert result.total_lost == 1
        assert result.win_rate == pytest.approx(2 / 3, abs=0.01)
        assert result.total_recovered_cents == 7000
        assert result.total_lost_cents == 3000

    def test_skipped_disputes_tracked(self):
        result = compute_analytics(
            AnalyticsInput(
                disputes=[
                    {"amount": 5000, "status": "skipped", "reason_code": "11.2", "recommendation": "skip"},
                    {"amount": 1000, "status": "won", "reason_code": "13.1", "recommendation": "fight"},
                ]
            )
        )
        assert result.total_skipped == 1
        assert result.money_saved_by_skipping_cents == 5000

    def test_pending_disputes_excluded_from_win_rate(self):
        result = compute_analytics(
            AnalyticsInput(
                disputes=[
                    {"amount": 5000, "status": "won", "reason_code": "10.4", "recommendation": "fight"},
                    {"amount": 3000, "status": "needs_response", "reason_code": "10.4", "recommendation": "fight"},
                    {"amount": 2000, "status": "under_review", "reason_code": "13.1", "recommendation": "fight"},
                ]
            )
        )
        assert result.total_disputes == 3
        assert result.total_won == 1
        assert result.total_lost == 0
        # Win rate only counts resolved disputes
        assert result.win_rate == 1.0

    def test_reason_code_breakdown(self):
        result = compute_analytics(
            AnalyticsInput(
                disputes=[
                    {"amount": 5000, "status": "won", "reason_code": "10.4", "recommendation": "fight"},
                    {"amount": 3000, "status": "lost", "reason_code": "10.4", "recommendation": "fight"},
                    {"amount": 2000, "status": "won", "reason_code": "13.1", "recommendation": "fight"},
                    {"amount": 1000, "status": "lost", "reason_code": "13.1", "recommendation": "fight"},
                ]
            )
        )
        assert len(result.reason_code_breakdown) == 2
        breakdown_map = {b.reason_code: b for b in result.reason_code_breakdown}

        rc_10_4 = breakdown_map["10.4"]
        assert rc_10_4.count == 2
        assert rc_10_4.won == 1
        assert rc_10_4.lost == 1

        rc_13_1 = breakdown_map["13.1"]
        assert rc_13_1.count == 2

    def test_reason_code_breakdown_sorted_by_count(self):
        result = compute_analytics(
            AnalyticsInput(
                disputes=[
                    {"amount": 5000, "status": "won", "reason_code": "10.4", "recommendation": "fight"},
                    {"amount": 3000, "status": "lost", "reason_code": "10.4", "recommendation": "fight"},
                    {"amount": 2000, "status": "won", "reason_code": "10.4", "recommendation": "fight"},
                    {"amount": 1000, "status": "won", "reason_code": "13.1", "recommendation": "fight"},
                ]
            )
        )
        assert result.reason_code_breakdown[0].reason_code == "10.4"
        assert result.reason_code_breakdown[0].count == 3
