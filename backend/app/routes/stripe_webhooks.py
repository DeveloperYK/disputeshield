import stripe
from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.user import User
from app.services.email_service import send_new_dispute_alert, send_outcome_notification
from app.services.reason_codes import get_reason_label
from app.services.stripe_service import get_or_create_dispute_from_webhook

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

stripe.api_key = settings.stripe_api_key


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(alias="Stripe-Signature"),
):
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload",
        )
    except stripe.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )

    db = SessionLocal()
    try:
        if event["type"] in (
            "charge.dispute.created",
            "charge.dispute.updated",
            "charge.dispute.closed",
        ):
            _handle_dispute_event(db, event)
    finally:
        db.close()

    return {"status": "ok"}


def _handle_dispute_event(db: Session, event: dict) -> None:
    dispute_data = event["data"]["object"]
    account_id = event.get("account")

    if account_id:
        user = (
            db.query(User)
            .filter(User.stripe_account_id == account_id)
            .first()
        )
    else:
        # Local dev / direct mode: no Connect account in event.
        # Fall back to any user that has a Stripe account connected,
        # or failing that, the first user in the DB.
        user = (
            db.query(User)
            .filter(User.stripe_account_id.isnot(None))
            .first()
        )
        if user is None:
            user = db.query(User).first()

    if user is None:
        return

    dispute = get_or_create_dispute_from_webhook(db, dispute_data, user)

    event_type = event["type"]
    reason_label = get_reason_label(dispute.reason_code, dispute.reason)

    if event_type == "charge.dispute.created":
        due_by = dispute.evidence_due_by.strftime("%b %d, %Y") if dispute.evidence_due_by else None
        send_new_dispute_alert(
            to_email=user.email,
            business_name=user.business_name or "",
            amount_cents=dispute.amount,
            currency=dispute.currency,
            reason_label=reason_label,
            dispute_id=str(dispute.id),
            due_by=due_by,
        )

    if event_type == "charge.dispute.closed":
        stripe_status = dispute_data.get("status", "")
        if stripe_status in ("won", "lost"):
            send_outcome_notification(
                to_email=user.email,
                business_name=user.business_name or "",
                amount_cents=dispute.amount,
                currency=dispute.currency,
                outcome=stripe_status,
                dispute_id=str(dispute.id),
            )
