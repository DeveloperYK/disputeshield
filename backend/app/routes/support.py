"""In-app chat support system."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.message import Message
from app.models.user import User
from app.routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/support", tags=["support"])


class SendMessage(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: str
    content: str
    is_admin: bool
    read: bool
    created_at: str

    model_config = {"from_attributes": True}


def _to_response(msg: Message) -> dict:
    return {
        "id": str(msg.id),
        "content": msg.content,
        "is_admin": msg.is_admin,
        "read": msg.read,
        "created_at": msg.created_at.isoformat() if msg.created_at else "",
    }


@router.get("/messages")
def get_messages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get chat messages for the current user."""
    messages = (
        db.query(Message)
        .filter(Message.user_id == current_user.id)
        .order_by(Message.created_at.asc())
        .all()
    )
    # Mark admin messages as read
    unread = [m for m in messages if m.is_admin and not m.read]
    for m in unread:
        m.read = True
    if unread:
        db.commit()

    return [_to_response(m) for m in messages]


@router.post("/messages")
def send_message(
    body: SendMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a chat message from the user."""
    if not body.content.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty")

    msg = Message(
        user_id=current_user.id,
        content=body.content.strip(),
        is_admin=False,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _to_response(msg)


@router.get("/unread-count")
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get count of unread admin replies for the current user."""
    count = (
        db.query(func.count(Message.id))
        .filter(
            Message.user_id == current_user.id,
            Message.is_admin == True,  # noqa: E712
            Message.read == False,  # noqa: E712
        )
        .scalar()
        or 0
    )
    return {"unread": count}
