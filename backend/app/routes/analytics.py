from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dispute import Dispute
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.dispute import AnalyticsResponse, ReasonCodeBreakdownResponse
from app.services.analytics import AnalyticsInput, compute_analytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsResponse)
def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    disputes = (
        db.query(Dispute)
        .filter(Dispute.user_id == current_user.id)
        .all()
    )

    dispute_dicts = [
        {
            "amount": d.amount,
            "status": d.status.value,
            "reason_code": d.reason_code or "unknown",
            "recommendation": "",
        }
        for d in disputes
    ]

    result = compute_analytics(AnalyticsInput(disputes=dispute_dicts))

    return AnalyticsResponse(
        total_disputes=result.total_disputes,
        total_won=result.total_won,
        total_lost=result.total_lost,
        total_skipped=result.total_skipped,
        win_rate=result.win_rate,
        total_recovered_cents=result.total_recovered_cents,
        total_lost_cents=result.total_lost_cents,
        money_saved_by_skipping_cents=result.money_saved_by_skipping_cents,
        reason_code_breakdown=[
            ReasonCodeBreakdownResponse(
                reason_code=b.reason_code,
                count=b.count,
                won=b.won,
                lost=b.lost,
                total_amount_cents=b.total_amount_cents,
            )
            for b in result.reason_code_breakdown
        ],
    )
