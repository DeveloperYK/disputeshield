"""Tests for email notification service."""
from __future__ import annotations

from unittest.mock import patch, MagicMock

from app.services.email_service import (
    send_new_dispute_alert,
    send_deadline_reminder,
    send_outcome_notification,
)


class TestNewDisputeAlert:
    @patch("app.services.email_service.settings")
    def test_skips_when_not_configured(self, mock_settings):
        mock_settings.resend_api_key = ""
        result = send_new_dispute_alert(
            to_email="test@example.com",
            business_name="Test Store",
            amount_cents=5000,
            currency="usd",
            reason_label="Suspected Fraud",
            dispute_id="abc-123",
        )
        assert result is False

    @patch("app.services.email_service.resend")
    @patch("app.services.email_service.settings")
    def test_sends_email_when_configured(self, mock_settings, mock_resend):
        mock_settings.resend_api_key = "re_test_key"
        mock_settings.email_from = "test@disputeshield.com"
        mock_settings.frontend_url = "http://localhost:3000"

        result = send_new_dispute_alert(
            to_email="merchant@example.com",
            business_name="Acme Store",
            amount_cents=12631,
            currency="usd",
            reason_label="Cancelled Recurring Transaction",
            dispute_id="abc-123",
            due_by="Apr 12, 2026",
        )

        assert result is True
        mock_resend.Emails.send.assert_called_once()
        call_args = mock_resend.Emails.send.call_args[0][0]
        assert call_args["to"] == ["merchant@example.com"]
        assert "$126.31" in call_args["subject"]
        assert "Cancelled Recurring Transaction" in call_args["subject"]


class TestDeadlineReminder:
    @patch("app.services.email_service.resend")
    @patch("app.services.email_service.settings")
    def test_sends_deadline_email(self, mock_settings, mock_resend):
        mock_settings.resend_api_key = "re_test_key"
        mock_settings.email_from = "test@disputeshield.com"
        mock_settings.frontend_url = "http://localhost:3000"

        result = send_deadline_reminder(
            to_email="merchant@example.com",
            business_name="Acme Store",
            amount_cents=5000,
            currency="usd",
            reason_label="Suspected Fraud",
            dispute_id="abc-123",
            hours_left=24,
        )

        assert result is True
        call_args = mock_resend.Emails.send.call_args[0][0]
        assert "24 hours" in call_args["subject"]


class TestOutcomeNotification:
    @patch("app.services.email_service.resend")
    @patch("app.services.email_service.settings")
    def test_sends_won_email(self, mock_settings, mock_resend):
        mock_settings.resend_api_key = "re_test_key"
        mock_settings.email_from = "test@disputeshield.com"
        mock_settings.frontend_url = "http://localhost:3000"

        result = send_outcome_notification(
            to_email="merchant@example.com",
            business_name="Acme Store",
            amount_cents=5000,
            currency="usd",
            outcome="won",
            dispute_id="abc-123",
        )

        assert result is True
        call_args = mock_resend.Emails.send.call_args[0][0]
        assert "won" in call_args["subject"].lower()

    @patch("app.services.email_service.resend")
    @patch("app.services.email_service.settings")
    def test_sends_lost_email(self, mock_settings, mock_resend):
        mock_settings.resend_api_key = "re_test_key"
        mock_settings.email_from = "test@disputeshield.com"
        mock_settings.frontend_url = "http://localhost:3000"

        result = send_outcome_notification(
            to_email="merchant@example.com",
            business_name="Acme Store",
            amount_cents=5000,
            currency="usd",
            outcome="lost",
            dispute_id="abc-123",
        )

        assert result is True
        call_args = mock_resend.Emails.send.call_args[0][0]
        assert "lost" in call_args["subject"].lower()
