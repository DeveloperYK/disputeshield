"""Tests for the reason code database — RED first, then implement."""
import pytest

from app.services.reason_codes import (
    get_reason_code_info,
    get_all_reason_codes,
    get_reason_codes_by_network,
    map_stripe_reason_to_code,
    ReasonCodeInfo,
)


class TestReasonCodeDatabase:
    """Verify we have comprehensive, accurate reason code data."""

    def test_get_known_visa_reason_code(self):
        info = get_reason_code_info("10.4")
        assert info is not None
        assert info.code == "10.4"
        assert info.network == "visa"
        assert info.category == "fraud"
        assert isinstance(info.description, str)
        assert len(info.description) > 0
        assert isinstance(info.base_win_rate, float)
        assert 0.0 <= info.base_win_rate <= 1.0

    def test_get_known_mastercard_reason_code(self):
        info = get_reason_code_info("4837")
        assert info is not None
        assert info.network == "mastercard"
        assert info.category == "fraud"

    def test_get_unknown_reason_code_returns_none(self):
        info = get_reason_code_info("FAKE_CODE")
        assert info is None

    def test_reason_code_has_required_evidence(self):
        info = get_reason_code_info("10.4")
        assert isinstance(info.required_evidence, list)
        assert len(info.required_evidence) > 0

    def test_reason_code_has_recommended_evidence(self):
        info = get_reason_code_info("10.4")
        assert isinstance(info.recommended_evidence, list)

    def test_get_all_reason_codes_returns_nonempty(self):
        codes = get_all_reason_codes()
        assert len(codes) > 0

    def test_all_reason_codes_have_valid_structure(self):
        codes = get_all_reason_codes()
        for code in codes:
            assert isinstance(code, ReasonCodeInfo)
            assert code.code
            assert code.network in ("visa", "mastercard", "amex", "discover")
            assert code.category in (
                "fraud",
                "authorization",
                "processing_error",
                "consumer_dispute",
            )
            assert 0.0 <= code.base_win_rate <= 1.0
            assert isinstance(code.required_evidence, list)
            assert isinstance(code.recommended_evidence, list)

    def test_get_visa_reason_codes(self):
        visa_codes = get_reason_codes_by_network("visa")
        assert len(visa_codes) > 0
        assert all(c.network == "visa" for c in visa_codes)

    def test_get_mastercard_reason_codes(self):
        mc_codes = get_reason_codes_by_network("mastercard")
        assert len(mc_codes) > 0
        assert all(c.network == "mastercard" for c in mc_codes)

    def test_stripe_reason_mapping(self):
        """Stripe uses simplified reason strings. We must map them to network codes."""
        info = get_reason_code_info("10.4")
        assert info.stripe_reasons is not None
        assert "fraudulent" in info.stripe_reasons

    def test_map_stripe_reason_fraudulent(self):
        """Stripe 'fraudulent' should map to a fraud reason code."""
        info = map_stripe_reason_to_code("fraudulent")
        assert info is not None
        assert info.category == "fraud"
        assert "fraudulent" in info.stripe_reasons

    def test_map_stripe_reason_product_not_received(self):
        info = map_stripe_reason_to_code("product_not_received")
        assert info is not None
        assert info.category == "consumer_dispute"

    def test_map_stripe_reason_duplicate(self):
        info = map_stripe_reason_to_code("duplicate")
        assert info is not None
        assert info.code == "12.6"

    def test_map_stripe_reason_subscription_canceled(self):
        info = map_stripe_reason_to_code("subscription_canceled")
        assert info is not None

    def test_map_stripe_reason_product_unacceptable(self):
        info = map_stripe_reason_to_code("product_unacceptable")
        assert info is not None

    def test_map_stripe_reason_credit_not_processed(self):
        info = map_stripe_reason_to_code("credit_not_processed")
        assert info is not None

    def test_map_stripe_reason_incorrect_amount(self):
        info = map_stripe_reason_to_code("incorrect_amount")
        assert info is not None

    def test_map_stripe_reason_general(self):
        info = map_stripe_reason_to_code("general")
        assert info is not None

    def test_map_stripe_reason_unrecognized(self):
        info = map_stripe_reason_to_code("unrecognized")
        assert info is not None

    def test_map_unknown_stripe_reason_returns_none(self):
        info = map_stripe_reason_to_code("totally_fake_reason")
        assert info is None

    def test_common_fraud_codes_exist(self):
        """Verify the most common chargeback reason codes are in our database."""
        # Visa fraud codes
        assert get_reason_code_info("10.4") is not None  # Other Fraud
        assert get_reason_code_info("10.5") is not None  # Visa Fraud Monitoring

        # Visa consumer disputes
        assert get_reason_code_info("13.1") is not None  # Merchandise Not Received
        assert get_reason_code_info("13.3") is not None  # Not as Described

        # Mastercard
        assert get_reason_code_info("4837") is not None  # No Cardholder Authorization
        assert get_reason_code_info("4853") is not None  # Cardholder Dispute
        assert get_reason_code_info("4863") is not None  # Cardholder Not Recognized
