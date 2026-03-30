"""Analysis engine — combines win probability with AI explanation.

Orchestrates the reason code lookup, evidence scoring, and Claude API
call to produce a complete dispute analysis.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from app.config import settings
from app.services.reason_codes import get_reason_code_info
from app.services.win_probability import calculate_win_probability


@dataclass(frozen=True)
class AnalysisInput:
    reason_code: str
    network: str
    amount_cents: int
    currency: str
    available_evidence: List[str]
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None


@dataclass(frozen=True)
class AnalysisResult:
    win_probability: float
    recommendation: str  # "fight", "skip", "borderline"
    explanation: str
    key_factors: List[str] = field(default_factory=list)
    missing_evidence: List[str] = field(default_factory=list)


def build_analysis_prompt(
    inp: AnalysisInput,
    probability: float,
    key_factors: List[str],
) -> str:
    """Build the prompt sent to Claude for dispute analysis."""
    amount_display = f"${inp.amount_cents / 100:.2f} {inp.currency.upper()}"

    reason_info = get_reason_code_info(inp.reason_code)
    reason_desc = reason_info.description if reason_info else "Unknown reason code"

    evidence_list = (
        ", ".join(inp.available_evidence) if inp.available_evidence else "None"
    )
    factors_text = "\n".join(f"- {f}" for f in key_factors) if key_factors else "None"

    return (
        f"You are a chargeback defense expert. Analyze this dispute and provide "
        f"a clear, actionable explanation for the merchant.\n\n"
        f"Dispute details:\n"
        f"- Network: {inp.network}\n"
        f"- Reason code: {inp.reason_code} — {reason_desc}\n"
        f"- Amount: {amount_display}\n"
        f"- Calculated win probability: {probability:.0%}\n"
        f"- Available evidence: {evidence_list}\n"
        f"- Key factors:\n{factors_text}\n\n"
        f"Provide a concise explanation of why this dispute has a "
        f"{probability:.0%} chance of winning, what evidence strengthens "
        f"or weakens the case, and what the merchant should do next. "
        f"Keep it under 200 words."
    )


async def _call_claude(prompt: str) -> str:
    """Call the Claude API. Separated for easy mocking in tests."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


async def analyze_dispute(inp: AnalysisInput) -> AnalysisResult:
    """Run full dispute analysis: probability + AI explanation."""
    prob_result = calculate_win_probability(
        reason_code=inp.reason_code,
        available_evidence=inp.available_evidence,
    )

    prompt = build_analysis_prompt(
        inp,
        probability=prob_result.probability,
        key_factors=prob_result.key_factors,
    )

    ai_explanation = await _call_claude(prompt)

    return AnalysisResult(
        win_probability=prob_result.probability,
        recommendation=prob_result.recommendation,
        explanation=ai_explanation,
        key_factors=prob_result.key_factors,
        missing_evidence=prob_result.missing_evidence,
    )
