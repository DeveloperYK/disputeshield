"""Integration tests for dispute action endpoints (skip, update status)."""
from __future__ import annotations


def test_skip_dispute(client, auth_headers, sample_dispute):
    response = client.post(
        f"/api/disputes/{sample_dispute.id}/skip",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "skipped"


def test_skip_dispute_not_found(client, auth_headers):
    response = client.post(
        "/api/disputes/00000000-0000-0000-0000-000000000000/skip",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_skip_dispute_unauthenticated(client, sample_dispute):
    response = client.post(f"/api/disputes/{sample_dispute.id}/skip")
    assert response.status_code == 401


def test_submit_response(client, auth_headers, db, sample_dispute):
    # First set a generated response on the dispute
    from app.models.dispute import Dispute

    dispute = db.query(Dispute).filter(Dispute.id == sample_dispute.id).first()
    dispute.generated_response = "Dear team, we contest this chargeback..."
    db.commit()

    response = client.post(
        f"/api/disputes/{sample_dispute.id}/submit",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "response_submitted"


def test_submit_without_response_fails(client, auth_headers, sample_dispute):
    response = client.post(
        f"/api/disputes/{sample_dispute.id}/submit",
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_add_manual_evidence(client, auth_headers, sample_dispute):
    response = client.post(
        f"/api/disputes/{sample_dispute.id}/evidence",
        headers=auth_headers,
        json={
            "evidence_type": "customer_communication",
            "title": "Email from customer",
            "description": "Customer confirmed order",
            "content": "Hi, I received my order on March 15th. Thanks!",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Email from customer"
    assert data["evidence_type"] == "customer_communication"
    assert data["source"] == "merchant_upload"
