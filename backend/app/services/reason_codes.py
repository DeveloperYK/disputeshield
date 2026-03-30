"""Reason code database for chargeback defense.

Provides lookup and filtering of card network reason codes with
base win rates, evidence requirements, and Stripe reason mappings.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


@dataclass(frozen=True)
class ReasonCodeInfo:
    code: str
    network: str
    category: str
    description: str
    base_win_rate: float
    required_evidence: List[str] = field(default_factory=list)
    recommended_evidence: List[str] = field(default_factory=list)
    stripe_reasons: List[str] = field(default_factory=list)
    time_limit_days: int = 30


def _load_reason_codes() -> Dict[str, ReasonCodeInfo]:
    data_path = Path(__file__).parent.parent / "data" / "reason_codes.json"
    with open(data_path, "r") as f:
        raw = json.load(f)

    codes: Dict[str, ReasonCodeInfo] = {}
    for entry in raw:
        info = ReasonCodeInfo(
            code=entry["code"],
            network=entry["network"],
            category=entry["category"],
            description=entry["description"],
            base_win_rate=entry["base_win_rate"],
            required_evidence=entry.get("required_evidence", []),
            recommended_evidence=entry.get("recommended_evidence", []),
            stripe_reasons=entry.get("stripe_reasons", []),
            time_limit_days=entry.get("time_limit_days", 30),
        )
        codes[info.code] = info
    return codes


_REASON_CODES = _load_reason_codes()


def get_reason_code_info(code: str) -> Optional[ReasonCodeInfo]:
    """Look up a reason code by its code string. Returns None if not found."""
    return _REASON_CODES.get(code)


def get_all_reason_codes() -> List[ReasonCodeInfo]:
    """Return all reason codes in the database."""
    return list(_REASON_CODES.values())


def get_reason_codes_by_network(network: str) -> List[ReasonCodeInfo]:
    """Return all reason codes for a given card network."""
    return [rc for rc in _REASON_CODES.values() if rc.network == network]


def _build_stripe_reason_index() -> Dict[str, ReasonCodeInfo]:
    """Build a reverse lookup from Stripe reason string → best matching reason code.

    When multiple codes match the same Stripe reason, prefer the one with
    the highest base win rate (most common / general match).
    """
    index: Dict[str, ReasonCodeInfo] = {}
    for info in _REASON_CODES.values():
        for stripe_reason in info.stripe_reasons:
            existing = index.get(stripe_reason)
            if existing is None or info.base_win_rate > existing.base_win_rate:
                index[stripe_reason] = info
    return index


_STRIPE_REASON_INDEX = _build_stripe_reason_index()


def map_stripe_reason_to_code(stripe_reason: str) -> Optional[ReasonCodeInfo]:
    """Map a Stripe reason string (e.g. 'fraudulent') to the best matching reason code.

    Returns None if no matching code is found.
    """
    return _STRIPE_REASON_INDEX.get(stripe_reason)
