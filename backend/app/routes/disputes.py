from __future__ import annotations

import uuid

import stripe
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
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
from app.services.evidence_guide import build_evidence_guide
from app.services.reason_codes import get_reason_description, get_reason_label
from app.services.response_generator import ResponseInput, generate_representment_letter
from app.services.stripe_service import pull_evidence_from_stripe, submit_evidence_to_stripe

router = APIRouter(prefix="/disputes", tags=["disputes"])


def _enrich_dispute_response(dispute: Dispute) -> DisputeResponse:
    """Build a DisputeResponse with human-readable reason labels."""
    resp = DisputeResponse.model_validate(dispute)
    resp.reason_label = get_reason_label(dispute.reason_code, dispute.reason)
    resp.reason_description = get_reason_description(dispute.reason_code, dispute.reason)
    return resp


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
        disputes=[_enrich_dispute_response(d) for d in disputes],
        total=len(disputes),
    )


@router.get("/{dispute_id}", response_model=DisputeResponse)
def get_dispute(
    dispute_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dispute = _get_user_dispute(db, dispute_id, current_user)
    return _enrich_dispute_response(dispute)


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


@router.get("/{dispute_id}/evidence-guide")
def get_evidence_guide(
    dispute_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a guided evidence checklist for a dispute.

    Returns required and recommended evidence items with human-readable
    descriptions, tips on where to find them, and collection status.
    """
    dispute = _get_user_dispute(db, dispute_id, current_user)
    evidence_items = (
        db.query(Evidence)
        .filter(Evidence.dispute_id == dispute.id)
        .all()
    )
    collected_types = [item.evidence_type.value for item in evidence_items]

    guide = build_evidence_guide(
        reason_code=dispute.reason_code,
        stripe_reason=dispute.reason,
        collected_types=collected_types,
    )

    return {
        "dispute_id": str(dispute.id),
        "reason_code": dispute.reason_code,
        "reason_label": get_reason_label(dispute.reason_code, dispute.reason),
        "items": [
            {
                "evidence_type": item.evidence_type,
                "label": item.label,
                "description": item.description,
                "where_to_find": item.where_to_find,
                "why_it_matters": item.why_it_matters,
                "priority": item.priority,
                "collected": item.collected,
                "accepts_file": item.accepts_file,
            }
            for item in guide
        ],
    }


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


_MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB (Stripe limit)
_ALLOWED_CONTENT_TYPES = {
    "image/png", "image/jpeg", "image/jpg", "image/gif",
    "application/pdf",
    "text/plain",
}


@router.post(
    "/{dispute_id}/evidence/upload",
    response_model=EvidenceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_evidence_file(
    dispute_id: uuid.UUID,
    evidence_type: str = Form(...),
    title: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a file as evidence. The file is sent directly to Stripe."""
    from app.config import settings
    from app.models.evidence import EvidenceSource, EvidenceType

    dispute = _get_user_dispute(db, dispute_id, current_user)

    # Validate evidence type
    try:
        ev_type = EvidenceType(evidence_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid evidence type: {evidence_type}",
        )

    # Validate content type
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed: {file.content_type}. Accepted: PNG, JPG, GIF, PDF, TXT.",
        )

    # Read file and validate size
    file_bytes = await file.read()
    if len(file_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large ({len(file_bytes) // (1024*1024)}MB). Maximum: 20MB.",
        )

    # Upload to Stripe
    try:
        stripe_file = stripe.File.create(
            file=(file.filename, file_bytes, file.content_type),
            purpose="dispute_evidence",
            api_key=settings.stripe_api_key,
        )
    except stripe.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to upload file to Stripe: {str(e)}",
        )

    evidence = Evidence(
        dispute_id=dispute.id,
        evidence_type=ev_type,
        source=EvidenceSource.MERCHANT_UPLOAD,
        title=title,
        description=description,
        stripe_file_id=stripe_file.id,
        file_name=file.filename,
        file_size=len(file_bytes),
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
    return _enrich_dispute_response(dispute)


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

    # Use the user's OAuth access token if available, otherwise fall back
    # to the platform API key (works in test mode / Stripe CLI).
    access_token = current_user.stripe_access_token or settings.stripe_api_key
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe account not connected",
        )

    # Gather evidence and submit to Stripe
    evidence_items = (
        db.query(Evidence)
        .filter(Evidence.dispute_id == dispute.id)
        .all()
    )

    try:
        submit_evidence_to_stripe(
            dispute=dispute,
            evidence_items=evidence_items,
            generated_response=dispute.generated_response,
            access_token=access_token,
        )
    except stripe.InvalidRequestError as e:
        # Stripe may reject if evidence was already submitted (e.g. retry
        # after a network hiccup).  Treat "already submitted" as success.
        if "maximum number of evidence submissions" not in str(e):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to submit evidence to Stripe: {str(e)}",
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to submit evidence to Stripe: {str(e)}",
        )

    # Refresh to pick up any concurrent webhook-driven updates.
    # The Stripe call above may trigger a charge.dispute.updated webhook
    # that updates this row via a separate DB session.
    db.expire(dispute)
    db.refresh(dispute)
    dispute.status = DisputeStatus.RESPONSE_SUBMITTED
    db.commit()
    db.refresh(dispute)
    return _enrich_dispute_response(dispute)


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
