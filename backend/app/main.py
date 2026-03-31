from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, get_db
from app.models import dispute, evidence, user  # noqa: F401 — register models
from app.routes import analytics, auth, billing, dev, disputes, stripe_connect, stripe_webhooks

# Create tables (for SQLite local dev)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chargeback Defense API",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3003",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(disputes.router, prefix="/api")
app.include_router(stripe_webhooks.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(stripe_connect.router, prefix="/api")
app.include_router(billing.router, prefix="/api")

if settings.debug:
    app.include_router(dev.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "chargeback-defense"}


@app.post("/api/cron/deadline-check")
def cron_deadline_check(
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    """Cron endpoint: check for approaching deadlines and send reminders.

    Protected by a simple bearer token (use SECRET_KEY).
    Call this every hour from your cron service.
    """
    expected = f"Bearer {settings.secret_key}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

    from app.services.deadline_checker import check_approaching_deadlines

    sent = check_approaching_deadlines(db)
    return {"status": "ok", "reminders_sent": sent}
