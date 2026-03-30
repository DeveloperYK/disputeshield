from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.models import dispute, evidence, user  # noqa: F401 — register models
from app.routes import analytics, auth, billing, disputes, stripe_connect, stripe_webhooks

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


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "chargeback-defense"}
