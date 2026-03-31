"""Integration tests for evidence guide endpoint."""
from __future__ import annotations


class TestEvidenceGuide:
    def test_returns_guide_for_dispute(self, client, auth_headers, sample_dispute):
        response = client.get(
            f"/api/disputes/{sample_dispute.id}/evidence-guide",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["dispute_id"] == str(sample_dispute.id)
        assert data["reason_label"]  # should have a human-readable label
        assert isinstance(data["items"], list)
        assert len(data["items"]) > 0

    def test_guide_items_have_required_fields(self, client, auth_headers, sample_dispute):
        response = client.get(
            f"/api/disputes/{sample_dispute.id}/evidence-guide",
            headers=auth_headers,
        )
        data = response.json()
        for item in data["items"]:
            assert "evidence_type" in item
            assert "label" in item
            assert "description" in item
            assert "where_to_find" in item
            assert "why_it_matters" in item
            assert "priority" in item
            assert item["priority"] in ("required", "recommended")
            assert "collected" in item
            assert "accepts_file" in item

    def test_guide_shows_collected_evidence(
        self, client, auth_headers, dispute_with_evidence,
    ):
        response = client.get(
            f"/api/disputes/{dispute_with_evidence.id}/evidence-guide",
            headers=auth_headers,
        )
        data = response.json()
        # dispute_with_evidence has a TRANSACTION_RECORD
        collected_types = [i["evidence_type"] for i in data["items"] if i["collected"]]
        assert "transaction_record" in collected_types

    def test_guide_requires_auth(self, client, sample_dispute):
        response = client.get(
            f"/api/disputes/{sample_dispute.id}/evidence-guide",
        )
        assert response.status_code == 401

    def test_guide_not_found(self, client, auth_headers):
        response = client.get(
            "/api/disputes/00000000-0000-0000-0000-000000000000/evidence-guide",
            headers=auth_headers,
        )
        assert response.status_code == 404
