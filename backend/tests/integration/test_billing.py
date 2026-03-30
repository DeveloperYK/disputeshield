"""Integration tests for billing/subscription endpoints."""
from __future__ import annotations

from unittest.mock import patch, MagicMock


def test_get_subscription_status(client, auth_headers):
    response = client.get("/api/billing/subscription", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["subscription_tier"] == "free"
    assert data["stripe_subscription_id"] is None


def test_get_subscription_unauthenticated(client):
    response = client.get("/api/billing/subscription")
    assert response.status_code == 401


def test_create_checkout_session(client, auth_headers):
    mock_session = MagicMock()
    mock_session.url = "https://checkout.stripe.com/c/pay_test_123"
    mock_session.id = "cs_test_123"

    with patch("stripe.checkout.Session.create", return_value=mock_session):
        response = client.post(
            "/api/billing/create-checkout",
            headers=auth_headers,
            json={"tier": "starter"},
        )
    assert response.status_code == 200
    data = response.json()
    assert "checkout_url" in data
    assert "checkout.stripe.com" in data["checkout_url"]


def test_create_checkout_invalid_tier(client, auth_headers):
    response = client.post(
        "/api/billing/create-checkout",
        headers=auth_headers,
        json={"tier": "nonexistent"},
    )
    assert response.status_code == 400


def test_create_checkout_unauthenticated(client):
    response = client.post(
        "/api/billing/create-checkout",
        json={"tier": "starter"},
    )
    assert response.status_code == 401


def test_create_portal_session(client, auth_headers, db):
    # Set up a stripe customer id first
    from app.models.user import User

    user = db.query(User).filter(User.email == "test@example.com").first()
    user.stripe_customer_id = "cus_test_123"
    db.commit()

    mock_session = MagicMock()
    mock_session.url = "https://billing.stripe.com/p/session/test_123"

    with patch(
        "stripe.billing_portal.Session.create", return_value=mock_session
    ):
        response = client.post(
            "/api/billing/portal",
            headers=auth_headers,
        )
    assert response.status_code == 200
    data = response.json()
    assert "portal_url" in data


def test_create_portal_no_customer(client, auth_headers):
    response = client.post(
        "/api/billing/portal",
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_billing_webhook_subscription_updated(client, db, registered_user):
    from app.models.user import User

    user = db.query(User).filter(User.email == "test@example.com").first()
    user.stripe_customer_id = "cus_test_webhook"
    db.commit()

    mock_event = MagicMock()
    mock_event.type = "customer.subscription.updated"
    mock_event.data.object.customer = "cus_test_webhook"
    mock_event.data.object.id = "sub_test_123"
    mock_event.data.object.status = "active"
    mock_event.data.object.items.data = [
        MagicMock(price=MagicMock(id="price_starter"))
    ]

    with patch("stripe.Webhook.construct_event", return_value=mock_event):
        response = client.post(
            "/api/billing/webhook",
            content=b'{"type": "test"}',
            headers={"stripe-signature": "test_sig"},
        )
    assert response.status_code == 200
