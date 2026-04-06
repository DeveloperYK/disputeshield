import logging
import stripe
from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.config import settings
from app.database import SessionLocal
from app.models.user import User
from app.services.email_service import send_new_dispute_alert, send_outcome_notification
from app.services.reason_codes import get_reason_label
from app.services.stripe_service import (
    get_or_create_dispute_from_webhook,
    pull_evidence_from_stripe,
)

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

    # Convert StripeObject to plain dict immediately — StripeObject
    # doesn't support .get() which breaks downstream code.
    event_dict = event.to_dict() if hasattr(event, "to_dict") else dict(event)
    event_type = event["type"]
    logger.info(f"Webhook received: {event_type}")

    db = SessionLocal()
    try:
        if event_type in (
            "charge.dispute.created",
            "charge.dispute.updated",
            "charge.dispute.closed",
        ):
            logger.info(f"Processing dispute event: {event_type}")
            _handle_dispute_event(db, event_dict)
        elif event_type == "account.application.deauthorized":
            _handle_deauthorization(db, event_dict)
        elif event_type == "account.updated":
            _handle_account_updated(db, event_dict)
        else:
            logger.info(f"Ignoring event type: {event_type}")
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
        logger.info("No user found for dispute webhook — skipping")
        return

    logger.info(f"Assigning dispute to user: {user.email} (id={user.id})")
    dispute = get_or_create_dispute_from_webhook(db, dispute_data, user)
    logger.info(f"Dispute created/updated: {dispute.id} stripe_id={dispute.stripe_dispute_id}")

    event_type = event["type"]
    reason_label = get_reason_label(dispute.reason_code, dispute.reason)

    if event_type == "charge.dispute.created":
        # Auto-pull transaction evidence from Stripe so merchants see
        # evidence pre-populated when they open the dispute.
        access_token = user.stripe_access_token or settings.stripe_api_key
        if access_token:
            try:
                pull_evidence_from_stripe(db, dispute, access_token)
                logger.info(f"Auto-pulled evidence for dispute {dispute.id}")
            except Exception:
                logger.warning(
                    f"Auto-pull evidence failed for dispute {dispute.id}",
                    exc_info=True,
                )

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
        stripe_status = dispute_data.get("status", "")  # dispute_data is already a plain dict
        if stripe_status in ("won", "lost"):
            send_outcome_notification(
                to_email=user.email,
                business_name=user.business_name or "",
                amount_cents=dispute.amount,
                currency=dispute.currency,
                outcome=stripe_status,
                dispute_id=str(dispute.id),
            )


def _handle_deauthorization(db: Session, event: dict) -> None:
    """Handle merchant disconnecting via Stripe's dashboard."""
    account_id = event.get("account")
    if not account_id:
        return
    user = (
        db.query(User)
        .filter(User.stripe_account_id == account_id)
        .first()
    )
    if user:
        user.stripe_account_id = None
        user.stripe_access_token = None
        user.stripe_refresh_token = None
        db.commit()
        logger.info(f"User {user.email} deauthorized via Stripe dashboard")


def _handle_account_updated(db: Session, event: dict) -> None:
    """Log notable account status changes (e.g. charges disabled)."""
    account_data = event["data"]["object"]
    account_id = account_data.get("id")
    if not account_id:
        return
    user = (
        db.query(User)
        .filter(User.stripe_account_id == account_id)
        .first()
    )
    if not user:
        return
    charges_enabled = account_data.get("charges_enabled")
    if charges_enabled is False:
        logger.warning(
            f"Stripe account {account_id} charges disabled for {user.email}"
        )
