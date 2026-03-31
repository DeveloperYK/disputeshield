"""Integration tests for evidence file upload endpoint."""
from __future__ import annotations

import io
from unittest.mock import MagicMock, patch

import pytest


class TestUploadEvidenceFile:
    """POST /disputes/{id}/evidence/upload"""

    def test_upload_pdf(self, client, auth_headers, sample_dispute):
        fake_stripe_file = MagicMock()
        fake_stripe_file.id = "file_test_pdf_123"

        with patch(
            "app.routes.disputes.stripe.File.create",
            return_value=fake_stripe_file,
        ):
            response = client.post(
                f"/api/disputes/{sample_dispute.id}/evidence/upload",
                headers=auth_headers,
                data={
                    "evidence_type": "receipt",
                    "title": "Order Receipt",
                    "description": "PDF receipt from Shopify",
                },
                files={"file": ("receipt.pdf", b"%PDF-1.4 fake content", "application/pdf")},
            )

        assert response.status_code == 201
        data = response.json()
        assert data["evidence_type"] == "receipt"
        assert data["title"] == "Order Receipt"
        assert data["stripe_file_id"] == "file_test_pdf_123"
        assert data["file_name"] == "receipt.pdf"
        assert data["file_size"] > 0
        assert data["source"] == "merchant_upload"

    def test_upload_png_image(self, client, auth_headers, sample_dispute):
        fake_stripe_file = MagicMock()
        fake_stripe_file.id = "file_test_png_456"

        with patch(
            "app.routes.disputes.stripe.File.create",
            return_value=fake_stripe_file,
        ):
            response = client.post(
                f"/api/disputes/{sample_dispute.id}/evidence/upload",
                headers=auth_headers,
                data={
                    "evidence_type": "screenshot",
                    "title": "Delivery Screenshot",
                },
                files={"file": ("delivery.png", b"\x89PNG fake", "image/png")},
            )

        assert response.status_code == 201
        data = response.json()
        assert data["evidence_type"] == "screenshot"
        assert data["stripe_file_id"] == "file_test_png_456"

    def test_rejects_invalid_content_type(self, client, auth_headers, sample_dispute):
        response = client.post(
            f"/api/disputes/{sample_dispute.id}/evidence/upload",
            headers=auth_headers,
            data={
                "evidence_type": "receipt",
                "title": "Some file",
            },
            files={"file": ("script.js", b"alert('hi')", "application/javascript")},
        )
        assert response.status_code == 400
        assert "not allowed" in response.json()["detail"]

    def test_rejects_invalid_evidence_type(self, client, auth_headers, sample_dispute):
        response = client.post(
            f"/api/disputes/{sample_dispute.id}/evidence/upload",
            headers=auth_headers,
            data={
                "evidence_type": "invalid_type",
                "title": "Some file",
            },
            files={"file": ("doc.pdf", b"%PDF fake", "application/pdf")},
        )
        assert response.status_code == 400
        assert "Invalid evidence type" in response.json()["detail"]

    def test_rejects_oversized_file(self, client, auth_headers, sample_dispute):
        # 21 MB file — over the 20 MB limit
        big_content = b"x" * (21 * 1024 * 1024)

        response = client.post(
            f"/api/disputes/{sample_dispute.id}/evidence/upload",
            headers=auth_headers,
            data={
                "evidence_type": "receipt",
                "title": "Huge file",
            },
            files={"file": ("huge.pdf", big_content, "application/pdf")},
        )
        assert response.status_code == 400
        assert "too large" in response.json()["detail"].lower()

    def test_upload_unauthenticated(self, client, sample_dispute):
        response = client.post(
            f"/api/disputes/{sample_dispute.id}/evidence/upload",
            data={
                "evidence_type": "receipt",
                "title": "Some file",
            },
            files={"file": ("doc.pdf", b"%PDF fake", "application/pdf")},
        )
        assert response.status_code == 401

    def test_upload_dispute_not_found(self, client, auth_headers):
        response = client.post(
            "/api/disputes/00000000-0000-0000-0000-000000000000/evidence/upload",
            headers=auth_headers,
            data={
                "evidence_type": "receipt",
                "title": "Some file",
            },
            files={"file": ("doc.pdf", b"%PDF fake", "application/pdf")},
        )
        assert response.status_code == 404

    def test_stripe_upload_failure_returns_502(self, client, auth_headers, sample_dispute):
        import stripe as stripe_mod

        with patch(
            "app.routes.disputes.stripe.File.create",
            side_effect=stripe_mod.StripeError("Upload failed"),
        ):
            response = client.post(
                f"/api/disputes/{sample_dispute.id}/evidence/upload",
                headers=auth_headers,
                data={
                    "evidence_type": "receipt",
                    "title": "Receipt",
                },
                files={"file": ("receipt.pdf", b"%PDF fake", "application/pdf")},
            )

        assert response.status_code == 502
        assert "Failed to upload" in response.json()["detail"]

    def test_uploaded_evidence_appears_in_list(self, client, auth_headers, sample_dispute):
        fake_stripe_file = MagicMock()
        fake_stripe_file.id = "file_test_list_789"

        with patch(
            "app.routes.disputes.stripe.File.create",
            return_value=fake_stripe_file,
        ):
            client.post(
                f"/api/disputes/{sample_dispute.id}/evidence/upload",
                headers=auth_headers,
                data={
                    "evidence_type": "customer_signature",
                    "title": "Signed Delivery",
                },
                files={"file": ("sig.png", b"\x89PNG fake", "image/png")},
            )

        response = client.get(
            f"/api/disputes/{sample_dispute.id}/evidence",
            headers=auth_headers,
        )
        assert response.status_code == 200
        items = response.json()
        assert any(item["stripe_file_id"] == "file_test_list_789" for item in items)
