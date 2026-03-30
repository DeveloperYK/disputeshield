"""AI response generator for representment letters.

Generates tailored dispute response letters based on reason code,
evidence, and card network requirements.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.config import settings
from app.services.reason_codes import get_reason_code_info


@dataclass(frozen=True)
class ResponseInput:
    reason_code: str
    network: str
    amount_cents: int
    currency: str
    evidence_summaries: List[Dict[str, Any]]
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    merchant_name: Optional[str] = None


@dataclass(frozen=True)
class RepresentmentLetter:
    letter_text: str
    reason_code: str
    network: str
    evidence_types_referenced: List[str] = field(default_factory=list)


def build_response_prompt(inp: ResponseInput) -> str:
    """Build the prompt for generating a representment letter."""
    amount_display = f"${inp.amount_cents / 100:.2f} {inp.currency.upper()}"
    merchant = inp.merchant_name or "the merchant"

    reason_info = get_reason_code_info(inp.reason_code)
    reason_desc = reason_info.description if reason_info else "Unknown reason code"

    evidence_lines = []
    for ev in inp.evidence_summaries:
        evidence_lines.append(f"- {ev.get('type', 'unknown')}: {ev.get('title', '')}")
    evidence_text = "\n".join(evidence_lines) if evidence_lines else "None provided"

    network_guidance = ""
    if reason_info:
        req = ", ".join(reason_info.required_evidence) if reason_info.required_evidence else "none specified"
        network_guidance = (
            f"\n{inp.network.capitalize()} requires the following evidence for "
            f"reason code {inp.reason_code}: {req}."
        )

    return (
        f"You are a chargeback defense specialist writing a representment letter "
        f"for {merchant}. Write a professional, persuasive dispute response letter.\n\n"
        f"Dispute details:\n"
        f"- Network: {inp.network}\n"
        f"- Reason code: {inp.reason_code} — {reason_desc}\n"
        f"- Amount: {amount_display}\n"
        f"- Customer: {inp.customer_name or 'Unknown'} ({inp.customer_email or 'no email'})\n"
        f"{network_guidance}\n\n"
        f"Available evidence:\n{evidence_text}\n\n"
        f"Write a formal representment letter that:\n"
        f"1. Clearly states the merchant is contesting the dispute\n"
        f"2. References each piece of evidence and explains how it proves "
        f"the transaction was legitimate\n"
        f"3. Addresses the specific reason code requirements for {inp.network}\n"
        f"4. Is professional and concise (under 500 words)\n"
        f"5. Ends with a clear request to reverse the chargeback\n\n"
        f"Return ONLY the letter text, no meta-commentary."
    )


async def _call_claude(prompt: str) -> str:
    """Call the Claude API. Separated for easy mocking in tests."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


async def generate_representment_letter(inp: ResponseInput) -> RepresentmentLetter:
    """Generate a representment letter using AI."""
    prompt = build_response_prompt(inp)
    letter_text = await _call_claude(prompt)

    evidence_types = [ev.get("type", "unknown") for ev in inp.evidence_summaries]

    return RepresentmentLetter(
        letter_text=letter_text,
        reason_code=inp.reason_code,
        network=inp.network,
        evidence_types_referenced=evidence_types,
    )
