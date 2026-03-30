from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dispute import Dispute
from app.models.evidence import Evidence
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.dispute import (
    DisputeAnalysis,
    DisputeListResponse,
    DisputeResponse,
    RepresentmentLetterResponse,
)
from app.schemas.evidence import EvidenceCreate, EvidenceResponse
from app.services.analysis_engine import AnalysisInput, analyze_dispute
from app.services.response_generator import ResponseInput, generate_representment_letter
from app.services.stripe_service import pull_evidence_from_stripe

router = APIRouter(prefix="/disputes", tags=["disputes"])


@router.get("", response_model=DisputeListResponse)
def list_disputes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    disputes = (
        db.query(Dispute)
        .filter(Dispute.user_id == current_user.id)
        .order_by(Dispute.evidence_due_by.asc().nullslast())
        .all()
    )
    return DisputeListResponse(
        disputes=[DisputeResponse.model_validate(d) for d in disputes],
        total=len(disputes),
    )


@router.get("/{dispute_id}", response_model=DisputeResponse)
def get_dispute(
    dispute_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dispute = _get_user_dispute(db, dispute_id, current_user)
    return DisputeResponse.model_validate(dispute)


@router.post("/{dispute_id}/pull-evidence", response_model=list[EvidenceResponse])
def pull_evidence(
    dispute_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dispute = _get_user_dispute(db, dispute_id, current_user)

    if not current_user.stripe_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe account not connected",
        )

    items = pull_evidence_from_stripe(db, dispute, current_user.stripe_access_token)
    return [EvidenceResponse.model_validate(item) for item in items]


@router.get("/{dispute_id}/evidence", response_model=list[EvidenceResponse])
def list_evidence(
    dispute_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dispute = _get_user_dispute(db, dispute_id, current_user)
    items = (
        db.query(Evidence)
        .filter(Evidence.dispute_id == dispute.id)
        .order_by(Evidence.created_at.asc())
        .all()
    )
    return [EvidenceResponse.model_validate(item) for item in items]


@router.post(
    "/{dispute_id}/evidence",
    response_model=EvidenceResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_evidence(
    dispute_id: uuid.UUID,
    evidence_data: EvidenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dispute = _get_user_dispute(db, dispute_id, current_user)
    from app.models.evidence import EvidenceSource

    evidence = Evidence(
        dispute_id=dispute.id,
        evidence_type=evidence_data.evidence_type,
        source=EvidenceSource.MERCHANT_UPLOAD,
        title=evidence_data.title,
        description=evidence_data.description,
        content=evidence_data.content,
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return EvidenceResponse.model_validate(evidence)


@router.post("/{dispute_id}/analyze", response_model=DisputeAnalysis)
async def analyze_dispute_endpoint(
    dispute_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dispute = _get_user_dispute(db, dispute_id, current_user)

    evidence_items = (
        db.query(Evidence)
        .filter(Evidence.dispute_id == dispute.id)
        .all()
    )
    available_evidence = [item.evidence_type.value for item in evidence_items]

    inp = AnalysisInput(
        reason_code=dispute.reason_code or "",
        network=dispute.network or "visa",
        amount_cents=dispute.amount,
        currency=dispute.currency,
        available_evidence=available_evidence,
        customer_email=dispute.customer_email,
        customer_name=dispute.customer_name,
    )
    result = await analyze_dispute(inp)

    dispute.win_probability = result.win_probability
    dispute.win_explanation = result.explanation
    db.commit()

    return DisputeAnalysis(
        win_probability=result.win_probability,
        explanation=result.explanation,
        recommendation=result.recommendation,
        key_factors=result.key_factors,
        missing_evidence=result.missing_evidence,
    )


@router.post("/{dispute_id}/generate-response", response_model=RepresentmentLetterResponse)
async def generate_response_endpoint(
    dispute_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dispute = _get_user_dispute(db, dispute_id, current_user)

    evidence_items = (
        db.query(Evidence)
        .filter(Evidence.dispute_id == dispute.id)
        .all()
    )
    evidence_summaries = [
        {"type": item.evidence_type.value, "title": item.title}
        for item in evidence_items
    ]

    inp = ResponseInput(
        reason_code=dispute.reason_code or "",
        network=dispute.network or "visa",
        amount_cents=dispute.amount,
        currency=dispute.currency,
        evidence_summaries=evidence_summaries,
        customer_email=dispute.customer_email,
        customer_name=dispute.customer_name,
        merchant_name=current_user.business_name,
    )
    result = await generate_representment_letter(inp)

    dispute.generated_response = result.letter_text
    db.commit()

    return RepresentmentLetterResponse(
        letter_text=result.letter_text,
        reason_code=result.reason_code,
        network=result.network,
        evidence_types_referenced=result.evidence_types_referenced,
    )


@router.post("/{dispute_id}/skip", response_model=DisputeResponse)
def skip_dispute(
    dispute_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.dispute import DisputeStatus

    dispute = _get_user_dispute(db, dispute_id, current_user)
    dispute.status = DisputeStatus.SKIPPED
    db.commit()
    db.refresh(dispute)
    return DisputeResponse.model_validate(dispute)


@router.post("/{dispute_id}/submit", response_model=DisputeResponse)
def submit_response(
    dispute_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.dispute import DisputeStatus

    dispute = _get_user_dispute(db, dispute_id, current_user)
    if not dispute.generated_response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No response generated yet. Generate a response first.",
        )
    dispute.status = DisputeStatus.RESPONSE_SUBMITTED
    db.commit()
    db.refresh(dispute)
    return DisputeResponse.model_validate(dispute)


def _get_user_dispute(
    db: Session, dispute_id: uuid.UUID, user: User
) -> Dispute:
    dispute = (
        db.query(Dispute)
        .filter(Dispute.id == dispute_id, Dispute.user_id == user.id)
        .first()
    )
    if dispute is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispute not found",
        )
    return dispute
