"""Billing and subscription management endpoints."""
from __future__ import annotations

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])

def _tier_price_map() -> dict[str, str]:
    return {
        "starter": settings.stripe_price_starter,
        "growth": settings.stripe_price_growth,
        "agency": settings.stripe_price_agency,
    }


def _price_tier_map() -> dict[str, str]:
    return {v: k for k, v in _tier_price_map().items()}


class SubscriptionResponse(BaseModel):
    subscription_tier: str
    stripe_subscription_id: str | None
    stripe_customer_id: str | None


class CheckoutRequest(BaseModel):
    tier: str


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str


@router.get("/subscription", response_model=SubscriptionResponse)
def get_subscription(
    current_user: User = Depends(get_current_user),
):
    return SubscriptionResponse(
        subscription_tier=current_user.subscription_tier,
        stripe_subscription_id=current_user.stripe_subscription_id,
        stripe_customer_id=current_user.stripe_customer_id,
    )


@router.post("/create-checkout", response_model=CheckoutResponse)
def create_checkout_session(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.tier not in _tier_price_map():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tier: {body.tier}. Must be one of: {', '.join(_tier_price_map().keys())}",
        )

    stripe.api_key = settings.stripe_api_key
    price_id = _tier_price_map()[body.tier]

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.frontend_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.frontend_url}/billing/cancel",
        customer_email=current_user.email,
        metadata={"user_id": str(current_user.id)},
    )

    return CheckoutResponse(checkout_url=session.url)


@router.post("/portal", response_model=PortalResponse)
def create_portal_session(
    current_user: User = Depends(get_current_user),
):
    if not current_user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No billing account found. Subscribe first.",
        )

    stripe.api_key = settings.stripe_api_key
    session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=f"{settings.frontend_url}/settings",
    )
    return PortalResponse(portal_url=session.url)


@router.post("/webhook")
async def billing_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    stripe.api_key = settings.stripe_api_key

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event.type == "checkout.session.completed":
        _handle_checkout_completed(db, event.data.object)
    elif event.type == "customer.subscription.updated":
        _handle_subscription_updated(db, event.data.object)
    elif event.type == "customer.subscription.deleted":
        _handle_subscription_deleted(db, event.data.object)

    return {"status": "ok"}


def _handle_checkout_completed(db: Session, session: object) -> None:
    """Save stripe_customer_id to user after first checkout."""
    user_id = getattr(session, "metadata", {}).get("user_id")
    customer_id = getattr(session, "customer", None)
    if not user_id or not customer_id:
        return

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return

    user.stripe_customer_id = customer_id
    db.commit()


def _handle_subscription_updated(db: Session, subscription: object) -> None:
    user = (
        db.query(User)
        .filter(User.stripe_customer_id == subscription.customer)
        .first()
    )
    if not user:
        return

    user.stripe_subscription_id = subscription.id

    if subscription.status == "active":
        price_id = subscription.items.data[0].price.id
        user.subscription_tier = _price_tier_map().get(price_id, "starter")
    elif subscription.status in ("past_due", "unpaid"):
        pass  # Keep current tier, payment will retry

    db.commit()


def _handle_subscription_deleted(db: Session, subscription: object) -> None:
    user = (
        db.query(User)
        .filter(User.stripe_customer_id == subscription.customer)
        .first()
    )
    if not user:
        return

    user.subscription_tier = "free"
    user.stripe_subscription_id = None
    db.commit()
