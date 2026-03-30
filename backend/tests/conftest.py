import uuid
from datetime import datetime, timezone, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models.dispute import Dispute, DisputeStatus
from app.models.evidence import Evidence, EvidenceSource, EvidenceType

TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def registered_user(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpassword123",
            "business_name": "Test Store",
        },
    )
    return response.json()


@pytest.fixture
def auth_headers(client, registered_user):
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "testpassword123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_dispute(db, registered_user):
    """Create a dispute in the DB linked to the registered user."""
    from app.models.user import User

    user = db.query(User).filter(User.email == "test@example.com").first()
    dispute = Dispute(
        id=uuid.uuid4(),
        user_id=user.id,
        stripe_dispute_id="dp_test_123",
        stripe_charge_id="ch_test_456",
        amount=5000,
        currency="usd",
        reason="fraudulent",
        reason_code="10.4",
        network="visa",
        status=DisputeStatus.NEEDS_RESPONSE,
        customer_email="buyer@example.com",
        customer_name="Jane Doe",
        dispute_created_at=datetime.now(timezone.utc),
        evidence_due_by=datetime.now(timezone.utc) + timedelta(days=20),
    )
    db.add(dispute)
    db.commit()
    db.refresh(dispute)
    return dispute


@pytest.fixture
def dispute_with_evidence(db, sample_dispute):
    """A dispute with some evidence already attached."""
    ev1 = Evidence(
        dispute_id=sample_dispute.id,
        evidence_type=EvidenceType.TRANSACTION_RECORD,
        source=EvidenceSource.STRIPE_AUTO,
        title="Stripe charge ch_test_456",
        content="Transaction for $50.00 on 2026-03-15",
    )
    ev2 = Evidence(
        dispute_id=sample_dispute.id,
        evidence_type=EvidenceType.CUSTOMER_COMMUNICATION,
        source=EvidenceSource.MERCHANT_UPLOAD,
        title="Email thread with buyer",
        content="Customer confirmed receipt on 2026-03-16",
    )
    db.add_all([ev1, ev2])
    db.commit()
    return sample_dispute
