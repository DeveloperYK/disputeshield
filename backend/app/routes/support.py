import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

import resend

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/support", tags=["support"])


class SupportMessage(BaseModel):
    type: str  # "bug" or "feature" or "general"
    message: str
    page_url: Optional[str] = None


@router.post("/message")
def submit_support_message(
    msg: SupportMessage,
    current_user: User = Depends(get_current_user),
):
    if not msg.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty")

    if not settings.resend_api_key or not settings.admin_email:
        logger.warning("Support message received but email not configured")
        return {"status": "received"}

    resend.api_key = settings.resend_api_key
    type_labels = {"bug": "Bug Report", "feature": "Feature Request", "general": "General"}
    label = type_labels.get(msg.type, "General")

    try:
        resend.Emails.send({
            "from": settings.email_from,
            "to": [settings.admin_email],
            "reply_to": current_user.email,
            "subject": f"[{label}] from {current_user.email}",
            "html": f"""
            <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
                <h2 style="color: #0a0f1e;">{label}</h2>
                <p><strong>From:</strong> {current_user.email} ({current_user.business_name or "No business name"})</p>
                {f'<p><strong>Page:</strong> {msg.page_url}</p>' if msg.page_url else ''}
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 16px 0;">
                    <p style="margin: 0; white-space: pre-wrap;">{msg.message}</p>
                </div>
                <p style="color: #64748b; font-size: 13px;">Reply to this email to respond directly to the user.</p>
            </div>
            """,
        })
        logger.info(f"Support message ({msg.type}) from {current_user.email}")
    except Exception:
        logger.exception("Failed to send support email")

    return {"status": "received"}
