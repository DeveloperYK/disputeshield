"""Integration tests for dispute analysis and response generation endpoints."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch


def test_analyze_dispute(client, auth_headers, dispute_with_evidence):
    with patch(
        "app.services.analysis_engine._call_claude",
        new_callable=AsyncMock,
        return_value="This dispute has moderate win potential due to available evidence.",
    ):
        response = client.post(
            f"/api/disputes/{dispute_with_evidence.id}/analyze",
            headers=auth_headers,
        )
    assert response.status_code == 200
    data = response.json()
    assert "win_probability" in data
    assert 0.0 <= data["win_probability"] <= 1.0
    assert data["recommendation"] in ("fight", "skip", "borderline")
    assert isinstance(data["explanation"], str)
    assert isinstance(data["key_factors"], list)
    assert isinstance(data["missing_evidence"], list)


def test_analyze_dispute_not_found(client, auth_headers):
    response = client.post(
        "/api/disputes/00000000-0000-0000-0000-000000000000/analyze",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_analyze_dispute_unauthenticated(client, sample_dispute):
    response = client.post(f"/api/disputes/{sample_dispute.id}/analyze")
    assert response.status_code == 401


def test_analyze_saves_result_to_dispute(client, auth_headers, db, dispute_with_evidence):
    with patch(
        "app.services.analysis_engine._call_claude",
        new_callable=AsyncMock,
        return_value="Analysis explanation text.",
    ):
        response = client.post(
            f"/api/disputes/{dispute_with_evidence.id}/analyze",
            headers=auth_headers,
        )
    assert response.status_code == 200

    # Verify the dispute record was updated
    from app.models.dispute import Dispute

    db.expire_all()
    dispute = db.query(Dispute).filter(Dispute.id == dispute_with_evidence.id).first()
    assert dispute.win_probability is not None
    assert dispute.win_explanation is not None


def test_generate_response(client, auth_headers, dispute_with_evidence):
    with patch(
        "app.services.response_generator._call_claude",
        new_callable=AsyncMock,
        return_value="Dear Dispute Team, we contest this chargeback...",
    ):
        response = client.post(
            f"/api/disputes/{dispute_with_evidence.id}/generate-response",
            headers=auth_headers,
        )
    assert response.status_code == 200
    data = response.json()
    assert "letter_text" in data
    assert len(data["letter_text"]) > 0
    assert data["reason_code"] == "10.4"
    assert data["network"] == "visa"


def test_generate_response_saves_to_dispute(
    client, auth_headers, db, dispute_with_evidence
):
    with patch(
        "app.services.response_generator._call_claude",
        new_callable=AsyncMock,
        return_value="Representment letter content.",
    ):
        response = client.post(
            f"/api/disputes/{dispute_with_evidence.id}/generate-response",
            headers=auth_headers,
        )
    assert response.status_code == 200

    from app.models.dispute import Dispute

    db.expire_all()
    dispute = db.query(Dispute).filter(Dispute.id == dispute_with_evidence.id).first()
    assert dispute.generated_response is not None


def test_generate_response_not_found(client, auth_headers):
    response = client.post(
        "/api/disputes/00000000-0000-0000-0000-000000000000/generate-response",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_generate_response_unauthenticated(client, sample_dispute):
    response = client.post(f"/api/disputes/{sample_dispute.id}/generate-response")
    assert response.status_code == 401


def test_list_disputes_includes_dispute(client, auth_headers, sample_dispute):
    response = client.get("/api/disputes", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["disputes"][0]["stripe_dispute_id"] == "dp_test_123"
    assert data["disputes"][0]["reason_code"] == "10.4"


def test_get_dispute_with_evidence(client, auth_headers, dispute_with_evidence):
    response = client.get(
        f"/api/disputes/{dispute_with_evidence.id}/evidence",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
