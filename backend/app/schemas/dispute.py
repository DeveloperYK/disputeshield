from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.dispute import DisputeStatus


class DisputeResponse(BaseModel):
    id: uuid.UUID
    stripe_dispute_id: str
    amount: int
    currency: str
    reason: str
    reason_code: str | None
    network: str | None
    status: DisputeStatus
    customer_email: str | None
    customer_name: str | None
    win_probability: float | None
    win_explanation: str | None
    dispute_created_at: datetime
    evidence_due_by: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DisputeListResponse(BaseModel):
    disputes: list[DisputeResponse]
    total: int


class DisputeAnalysis(BaseModel):
    win_probability: float
    explanation: str
    recommendation: str  # "fight", "skip", or "borderline"
    key_factors: list[str]
    missing_evidence: list[str]


class RepresentmentLetterResponse(BaseModel):
    letter_text: str
    reason_code: str
    network: str
    evidence_types_referenced: list[str]


class ReasonCodeBreakdownResponse(BaseModel):
    reason_code: str
    count: int
    won: int
    lost: int
    total_amount_cents: int


class AnalyticsResponse(BaseModel):
    total_disputes: int
    total_won: int
    total_lost: int
    total_skipped: int
    win_rate: float
    total_recovered_cents: int
    total_lost_cents: int
    money_saved_by_skipping_cents: int
    reason_code_breakdown: list[ReasonCodeBreakdownResponse]
