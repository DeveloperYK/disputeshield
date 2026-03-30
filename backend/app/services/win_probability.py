"""Win probability engine for chargeback defense.

Combines reason code base win rates with evidence strength
to produce an actionable win probability score.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from app.services.reason_codes import ReasonCodeInfo, get_reason_code_info

# Weight split: 70% required evidence, 30% recommended
_REQUIRED_WEIGHT = 0.7
_RECOMMENDED_WEIGHT = 0.3

# Thresholds for recommendation
_FIGHT_THRESHOLD = 0.45
_SKIP_THRESHOLD = 0.25

# Default base rate for unknown codes
_UNKNOWN_BASE_RATE = 0.10


@dataclass(frozen=True)
class EvidenceStrength:
    score: float  # 0.0 to 1.0
    missing_required: List[str] = field(default_factory=list)
    missing_recommended: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class WinProbabilityResult:
    probability: float
    recommendation: str  # "fight", "skip", "borderline"
    key_factors: List[str] = field(default_factory=list)
    missing_evidence: List[str] = field(default_factory=list)
    evidence_strength: float = 0.0


def calculate_evidence_strength(
    reason: ReasonCodeInfo,
    available_evidence: List[str],
) -> EvidenceStrength:
    """Score how well the available evidence matches what's needed."""
    evidence_set = set(available_evidence)

    required = reason.required_evidence
    recommended = reason.recommended_evidence

    missing_required = [e for e in required if e not in evidence_set]
    missing_recommended = [e for e in recommended if e not in evidence_set]

    if not required and not recommended:
        score = 1.0 if available_evidence else 0.0
    else:
        req_ratio = (
            (len(required) - len(missing_required)) / len(required)
            if required
            else 1.0
        )
        rec_ratio = (
            (len(recommended) - len(missing_recommended)) / len(recommended)
            if recommended
            else 1.0
        )

        has_required = len(required) > 0
        has_recommended = len(recommended) > 0

        if has_required and has_recommended:
            score = req_ratio * _REQUIRED_WEIGHT + rec_ratio * _RECOMMENDED_WEIGHT
        elif has_required:
            score = req_ratio
        else:
            score = rec_ratio

    score = max(0.0, min(1.0, score))

    return EvidenceStrength(
        score=score,
        missing_required=missing_required,
        missing_recommended=missing_recommended,
    )


def calculate_win_probability(
    reason_code: str,
    available_evidence: List[str],
) -> WinProbabilityResult:
    """Calculate win probability combining base rate and evidence strength."""
    reason = get_reason_code_info(reason_code)

    if reason is None:
        return WinProbabilityResult(
            probability=_UNKNOWN_BASE_RATE,
            recommendation="skip",
            key_factors=["Unknown reason code — insufficient data to assess"],
            missing_evidence=[],
            evidence_strength=0.0,
        )

    strength = calculate_evidence_strength(reason, available_evidence)

    # Probability formula: base rate adjusted by evidence strength
    # No evidence → penalise below base rate
    # Full evidence → boost above base rate
    # The adjustment range is capped so probability stays in [0, 1]
    max_boost = min(0.40, 1.0 - reason.base_win_rate)
    max_penalty = min(0.20, reason.base_win_rate)

    adjustment = strength.score * (max_boost + max_penalty) - max_penalty
    probability = reason.base_win_rate + adjustment
    probability = max(0.0, min(1.0, probability))

    # Build key factors
    key_factors = _build_key_factors(reason, strength)

    # Missing evidence for the response
    all_missing = strength.missing_required + strength.missing_recommended

    # Recommendation
    if probability >= _FIGHT_THRESHOLD:
        recommendation = "fight"
    elif probability <= _SKIP_THRESHOLD:
        recommendation = "skip"
    else:
        recommendation = "borderline"

    return WinProbabilityResult(
        probability=round(probability, 4),
        recommendation=recommendation,
        key_factors=key_factors,
        missing_evidence=all_missing,
        evidence_strength=strength.score,
    )


def _build_key_factors(
    reason: ReasonCodeInfo, strength: EvidenceStrength
) -> List[str]:
    """Build human-readable key factors for the probability assessment."""
    factors: List[str] = []

    factors.append(
        f"Reason code {reason.code} ({reason.description.split('.')[0]}) "
        f"has a {reason.base_win_rate:.0%} baseline win rate"
    )

    if strength.score >= 0.8:
        factors.append("Strong evidence package — most required evidence present")
    elif strength.score >= 0.5:
        factors.append("Moderate evidence — some key pieces still missing")
    elif strength.score > 0.0:
        factors.append("Weak evidence — critical documents missing")
    else:
        factors.append("No evidence provided — very low chance of winning")

    if strength.missing_required:
        factors.append(
            f"Missing required evidence: {', '.join(strength.missing_required)}"
        )

    return factors
