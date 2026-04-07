import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.dispute import Dispute
from app.models.user import User
from app.routes.auth import get_current_user

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
