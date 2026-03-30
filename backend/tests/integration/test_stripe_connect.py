"""Integration tests for Stripe Connect OAuth flow."""
from __future__ import annotations

from unittest.mock import patch, MagicMock


def test_stripe_connect_url(client, auth_headers):
    response = client.get("/api/stripe/connect-url", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert "https://connect.stripe.com/oauth/authorize" in data["url"]


def test_stripe_connect_url_unauthenticated(client):
    response = client.get("/api/stripe/connect-url")
    assert response.status_code == 401


def test_stripe_connect_callback(client, auth_headers, db):
    mock_response = MagicMock()
    mock_response.stripe_user_id = "acct_test_123"
    mock_response.access_token = "sk_test_token"
    mock_response.refresh_token = "rt_test_token"

    with patch("stripe.OAuth.token", return_value=mock_response):
        response = client.post(
            "/api/stripe/connect-callback",
            headers=auth_headers,
            json={"code": "ac_test_auth_code"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["stripe_account_id"] == "acct_test_123"
    assert data["is_active"] is True


def test_stripe_connect_callback_no_code(client, auth_headers):
    response = client.post(
        "/api/stripe/connect-callback",
        headers=auth_headers,
        json={},
    )
    assert response.status_code == 422


def test_stripe_connect_callback_unauthenticated(client):
    response = client.post(
        "/api/stripe/connect-callback",
        json={"code": "ac_test_code"},
    )
    assert response.status_code == 401


def test_stripe_disconnect(client, auth_headers, db):
    # First connect
    mock_response = MagicMock()
    mock_response.stripe_user_id = "acct_test_456"
    mock_response.access_token = "sk_test_token_2"
    mock_response.refresh_token = "rt_test_token_2"

    with patch("stripe.OAuth.token", return_value=mock_response):
        client.post(
            "/api/stripe/connect-callback",
            headers=auth_headers,
            json={"code": "ac_test_code_2"},
        )

    # Then disconnect
    with patch("stripe.OAuth.deauthorize", return_value=MagicMock()):
        response = client.post(
            "/api/stripe/disconnect",
            headers=auth_headers,
        )
    assert response.status_code == 200
    data = response.json()
    assert data["stripe_account_id"] is None
