import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, inspect as sa_inspect
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, get_db
from app.models.dispute import Dispute
from app.models.message import Message
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.auth import create_access_token, get_user_by_email, hash_password

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not settings.admin_email or current_user.email != settings.admin_email:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats")
def admin_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    total_users = db.query(func.count(User.id)).scalar() or 0
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_signups = (
        db.query(func.count(User.id))
        .filter(User.created_at >= week_ago)
        .scalar()
        or 0
    )
    connected_users = (
        db.query(func.count(User.id))
        .filter(User.stripe_account_id.isnot(None))
        .scalar()
        or 0
    )
    total_disputes = db.query(func.count(Dispute.id)).scalar() or 0

    return {
        "total_users": total_users,
        "recent_signups": recent_signups,
        "connected_users": connected_users,
        "total_disputes": total_disputes,
    }


@router.get("/users")
def admin_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        dispute_count = db.query(func.count(Dispute.id)).filter(Dispute.user_id == u.id).scalar() or 0
        result.append({
            "id": str(u.id),
            "email": u.email,
            "business_name": u.business_name,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "stripe_connected": u.stripe_account_id is not None,
            "subscription_tier": u.subscription_tier,
            "dispute_count": dispute_count,
        })
    return result


@router.get("/conversations")
def admin_conversations(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Get all conversations with latest message and unread count."""
    from sqlalchemy import desc

    users_with_messages = (
        db.query(User)
        .join(Message, Message.user_id == User.id)
        .distinct()
        .all()
    )

    conversations = []
    for u in users_with_messages:
        latest = (
            db.query(Message)
            .filter(Message.user_id == u.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        unread = (
            db.query(func.count(Message.id))
            .filter(
                Message.user_id == u.id,
                Message.is_admin == False,  # noqa: E712
                Message.read == False,  # noqa: E712
            )
            .scalar()
            or 0
        )
        conversations.append({
            "user_id": str(u.id),
            "email": u.email,
            "business_name": u.business_name,
            "latest_message": latest.content[:100] if latest else "",
            "latest_at": latest.created_at.isoformat() if latest and latest.created_at else "",
            "unread": unread,
        })

    # Sort by latest message time, most recent first
    conversations.sort(key=lambda c: c["latest_at"], reverse=True)
    return conversations


@router.get("/conversations/{user_id}")
def admin_get_conversation(
    user_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Get all messages in a specific conversation."""
    messages = (
        db.query(Message)
        .filter(Message.user_id == user_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    # Mark user messages as read
    unread = [m for m in messages if not m.is_admin and not m.read]
    for m in unread:
        m.read = True
    if unread:
        db.commit()

    return [{
        "id": str(m.id),
        "content": m.content,
        "is_admin": m.is_admin,
        "read": m.read,
        "created_at": m.created_at.isoformat() if m.created_at else "",
    } for m in messages]


@router.post("/conversations/{user_id}/reply")
def admin_reply(
    user_id: str,
    body: dict,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Send admin reply to a user's conversation."""
    content = body.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=422, detail="Message cannot be empty")

    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    msg = Message(
        user_id=user_id,
        content=content,
        is_admin=True,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {
        "id": str(msg.id),
        "content": msg.content,
        "is_admin": msg.is_admin,
        "read": msg.read,
        "created_at": msg.created_at.isoformat() if msg.created_at else "",
    }


# --- Setup utilities (protected by SECRET_KEY, not JWT) ---


def _require_secret(authorization: str = Header(default="")) -> None:
    if authorization != f"Bearer {settings.secret_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/setup/ensure-tables")
def ensure_tables(_: None = Depends(_require_secret)):
    """Create any missing database tables."""
    Base.metadata.create_all(bind=engine)
    inspector = sa_inspect(engine)
    return {"status": "ok", "tables": inspector.get_table_names()}


@router.post("/setup/create-admin")
def create_admin(
    _: None = Depends(_require_secret),
    db: Session = Depends(get_db),
):
    """Create admin account or return existing one."""
    admin_email = settings.admin_email
    if not admin_email:
        raise HTTPException(status_code=400, detail="ADMIN_EMAIL not set")

    existing = get_user_by_email(db, admin_email)
    if existing:
        token = create_access_token({"sub": existing.email})
        return {"status": "exists", "email": existing.email, "token": token}

    user = User(
        email=admin_email,
        hashed_password=hash_password("DisputeShield2026"),
        business_name="DisputeShield Admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.email})
    return {"status": "created", "email": user.email, "token": token}
