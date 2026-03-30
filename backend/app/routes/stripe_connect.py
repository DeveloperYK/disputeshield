"""Stripe Connect OAuth flow for merchant account connection."""
from __future__ import annotations

from urllib.parse import urlencode

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/stripe", tags=["stripe"])


class ConnectCallbackRequest(BaseModel):
    code: str


class ConnectUrlResponse(BaseModel):
    url: str


@router.get("/connect-url", response_model=ConnectUrlResponse)
def get_connect_url(
    current_user: User = Depends(get_current_user),
):
    params = urlencode(
        {
            "response_type": "code",
            "client_id": settings.stripe_client_id,
            "scope": "read_write",
            "redirect_uri": f"{settings.frontend_url}/stripe/callback",
        }
    )
    url = f"https://connect.stripe.com/oauth/authorize?{params}"
    return ConnectUrlResponse(url=url)


@router.post("/connect-callback", response_model=UserResponse)
def connect_callback(
    body: ConnectCallbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stripe.api_key = settings.stripe_api_key

    try:
        response = stripe.OAuth.token(
            grant_type="authorization_code",
            code=body.code,
        )
    except stripe.OAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe OAuth error: {e.user_message}",
        )

    current_user.stripe_account_id = response.stripe_user_id
    current_user.stripe_access_token = response.access_token
    current_user.stripe_refresh_token = response.refresh_token
    db.commit()
    db.refresh(current_user)

    return UserResponse.model_validate(current_user)


@router.post("/disconnect", response_model=UserResponse)
def disconnect_stripe(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.stripe_account_id:
        stripe.api_key = settings.stripe_api_key
        try:
            stripe.OAuth.deauthorize(
                client_id=settings.stripe_client_id,
                stripe_user_id=current_user.stripe_account_id,
            )
        except stripe.OAuthError:
            pass  # Deauth may fail if already deauthorized

    current_user.stripe_account_id = None
    current_user.stripe_access_token = None
    current_user.stripe_refresh_token = None
    db.commit()
    db.refresh(current_user)

    return UserResponse.model_validate(current_user)
