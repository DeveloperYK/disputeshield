import stripe
from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.user import User
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

    if not account_id:
        return

    user = (
        db.query(User)
        .filter(User.stripe_account_id == account_id)
        .first()
    )
    if user is None:
        return

    get_or_create_dispute_from_webhook(db, dispute_data, user)
