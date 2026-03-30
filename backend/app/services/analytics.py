"""Analytics service for chargeback outcome tracking.

Computes win/loss rates, total recovered, reason code breakdowns,
and money saved by skipping low-probability disputes.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List


_RESOLVED_STATUSES = {"won", "lost"}
_PENDING_STATUSES = {"needs_response", "under_review", "response_submitted"}


@dataclass(frozen=True)
class AnalyticsInput:
    disputes: List[Dict[str, Any]]


@dataclass(frozen=True)
class ReasonCodeBreakdown:
    reason_code: str
    count: int
    won: int
    lost: int
    total_amount_cents: int


@dataclass(frozen=True)
class AnalyticsResult:
    total_disputes: int
    total_won: int
    total_lost: int
    total_skipped: int
    win_rate: float
    total_recovered_cents: int
    total_lost_cents: int
    money_saved_by_skipping_cents: int
    reason_code_breakdown: List[ReasonCodeBreakdown] = field(default_factory=list)


def compute_analytics(inp: AnalyticsInput) -> AnalyticsResult:
    """Compute analytics from a list of dispute dicts."""
    total = len(inp.disputes)
    won = 0
    lost = 0
    skipped = 0
    recovered = 0
    lost_amount = 0
    skipped_amount = 0

    rc_data: Dict[str, Dict[str, int]] = defaultdict(
        lambda: {"count": 0, "won": 0, "lost": 0, "amount": 0}
    )

    for d in inp.disputes:
        status = d.get("status", "")
        amount = d.get("amount", 0)
        reason_code = d.get("reason_code", "unknown")

        rc_data[reason_code]["count"] += 1
        rc_data[reason_code]["amount"] += amount

        if status == "won":
            won += 1
            recovered += amount
            rc_data[reason_code]["won"] += 1
        elif status == "lost":
            lost += 1
            lost_amount += amount
            rc_data[reason_code]["lost"] += 1
        elif status == "skipped":
            skipped += 1
            skipped_amount += amount

    resolved = won + lost
    win_rate = won / resolved if resolved > 0 else 0.0

    breakdown = sorted(
        [
            ReasonCodeBreakdown(
                reason_code=code,
                count=data["count"],
                won=data["won"],
                lost=data["lost"],
                total_amount_cents=data["amount"],
            )
            for code, data in rc_data.items()
        ],
        key=lambda b: b.count,
        reverse=True,
    )

    return AnalyticsResult(
        total_disputes=total,
        total_won=won,
        total_lost=lost,
        total_skipped=skipped,
        win_rate=win_rate,
        total_recovered_cents=recovered,
        total_lost_cents=lost_amount,
        money_saved_by_skipping_cents=skipped_amount,
        reason_code_breakdown=breakdown,
    )
