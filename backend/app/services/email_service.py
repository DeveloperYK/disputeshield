"""Email notification service using Resend."""
from __future__ import annotations

import logging
from typing import Optional

import resend

from app.config import settings

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    return bool(settings.resend_api_key)


def send_signup_notification(user_email: str, business_name: str) -> bool:
    """Notify admin when a new user registers."""
    if not _is_configured() or not settings.admin_email:
        return False
    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send({
            "from": settings.email_from,
            "to": [settings.admin_email],
            "subject": f"New signup: {user_email}",
            "html": f"""
            <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
                <h2 style="color: #0a0f1e;">New User Signup</h2>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 16px 0;">
                    <p style="margin: 0 0 8px;"><strong>Email:</strong> {user_email}</p>
                    <p style="margin: 0;"><strong>Business:</strong> {business_name or "Not provided"}</p>
                </div>
                <p style="color: #64748b; font-size: 13px;">— DisputeShield</p>
            </div>
            """,
        })
        logger.info(f"Signup notification sent for {user_email}")
        return True
    except Exception:
        logger.exception(f"Failed to send signup notification for {user_email}")
        return False


def send_new_dispute_alert(
    to_email: str,
    business_name: str,
    amount_cents: int,
    currency: str,
    reason_label: str,
    dispute_id: str,
    due_by: Optional[str] = None,
) -> bool:
    """Send email when a new chargeback arrives."""
    if not _is_configured():
        logger.info("Resend not configured — skipping new dispute email")
        return False

    resend.api_key = settings.resend_api_key
    amount = f"${amount_cents / 100:,.2f} {currency.upper()}"
    due_line = f"<p><strong>Evidence deadline:</strong> {due_by}</p>" if due_by else ""
    dispute_url = f"{settings.frontend_url}/disputes/{dispute_id}"

    try:
        resend.Emails.send({
            "from": settings.email_from,
            "to": [to_email],
            "subject": f"New chargeback: {amount} — {reason_label}",
            "html": f"""
            <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
                <h2 style="color: #0a0f1e;">New Chargeback Received</h2>
                <p>Hi {business_name or "there"},</p>
                <p>A new chargeback has been filed against your account:</p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 16px 0;">
                    <p style="margin: 0 0 8px;"><strong>Amount:</strong> {amount}</p>
                    <p style="margin: 0 0 8px;"><strong>Reason:</strong> {reason_label}</p>
                    {due_line}
                </div>
                <p>Log in to DisputeShield to analyse this dispute and decide whether to fight it.</p>
                <a href="{dispute_url}" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
                    View Dispute
                </a>
                <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— DisputeShield</p>
            </div>
            """,
        })
        logger.info(f"New dispute email sent to {to_email}")
        return True
    except Exception:
        logger.exception(f"Failed to send new dispute email to {to_email}")
        return False


def send_deadline_reminder(
    to_email: str,
    business_name: str,
    amount_cents: int,
    currency: str,
    reason_label: str,
    dispute_id: str,
    hours_left: int,
) -> bool:
    """Send email when a chargeback deadline is approaching."""
    if not _is_configured():
        logger.info("Resend not configured — skipping deadline reminder")
        return False

    resend.api_key = settings.resend_api_key
    amount = f"${amount_cents / 100:,.2f} {currency.upper()}"
    dispute_url = f"{settings.frontend_url}/disputes/{dispute_id}"
    time_str = f"{hours_left} hours" if hours_left < 48 else f"{hours_left // 24} days"

    try:
        resend.Emails.send({
            "from": settings.email_from,
            "to": [to_email],
            "subject": f"Deadline in {time_str}: {amount} chargeback",
            "html": f"""
            <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Chargeback Deadline Approaching</h2>
                <p>Hi {business_name or "there"},</p>
                <p>You have <strong>{time_str}</strong> left to respond to this chargeback:</p>
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 16px 0;">
                    <p style="margin: 0 0 8px;"><strong>Amount:</strong> {amount}</p>
                    <p style="margin: 0 0 8px;"><strong>Reason:</strong> {reason_label}</p>
                    <p style="margin: 0; color: #dc2626; font-weight: 600;">Deadline: {time_str} remaining</p>
                </div>
                <p>If you don't respond in time, you'll automatically lose this dispute.</p>
                <a href="{dispute_url}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
                    Respond Now
                </a>
                <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— DisputeShield</p>
            </div>
            """,
        })
        logger.info(f"Deadline reminder sent to {to_email} ({time_str} left)")
        return True
    except Exception:
        logger.exception(f"Failed to send deadline reminder to {to_email}")
        return False


def send_outcome_notification(
    to_email: str,
    business_name: str,
    amount_cents: int,
    currency: str,
    outcome: str,
    dispute_id: str,
) -> bool:
    """Send email when a dispute outcome is determined (won/lost)."""
    if not _is_configured():
        logger.info("Resend not configured — skipping outcome email")
        return False

    resend.api_key = settings.resend_api_key
    amount = f"${amount_cents / 100:,.2f} {currency.upper()}"
    dispute_url = f"{settings.frontend_url}/disputes/{dispute_id}"
    won = outcome == "won"

    subject = f"You won the {amount} chargeback!" if won else f"Chargeback lost: {amount}"
    heading_color = "#059669" if won else "#dc2626"
    heading = "Chargeback Won!" if won else "Chargeback Lost"
    body = (
        f"Great news — the {amount} chargeback has been resolved in your favour. The funds will be returned to your account."
        if won
        else f"Unfortunately, the {amount} chargeback was resolved against you. The disputed amount has been deducted."
    )
    bg_color = "#f0fdf4" if won else "#fef2f2"
    border_color = "#bbf7d0" if won else "#fecaca"

    try:
        resend.Emails.send({
            "from": settings.email_from,
            "to": [to_email],
            "subject": subject,
            "html": f"""
            <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
                <h2 style="color: {heading_color};">{heading}</h2>
                <p>Hi {business_name or "there"},</p>
                <div style="background: {bg_color}; border: 1px solid {border_color}; border-radius: 12px; padding: 20px; margin: 16px 0;">
                    <p style="margin: 0; font-size: 16px;">{body}</p>
                </div>
                <a href="{dispute_url}" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
                    View Details
                </a>
                <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— DisputeShield</p>
            </div>
            """,
        })
        logger.info(f"Outcome email ({outcome}) sent to {to_email}")
        return True
    except Exception:
        logger.exception(f"Failed to send outcome email to {to_email}")
        return False
