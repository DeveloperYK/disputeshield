from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Chargeback Defense"
    debug: bool = False

    # Database
    database_url: str = "postgresql://localhost:5432/chargeback_defense"

    # Auth
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    algorithm: str = "HS256"

    # Stripe
    stripe_api_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_client_id: str = ""  # For Stripe Connect OAuth
    stripe_price_starter: str = "price_starter"
    stripe_price_growth: str = "price_growth"
    stripe_price_agency: str = "price_agency"

    # Anthropic
    anthropic_api_key: str = ""

    # Email (Resend)
    resend_api_key: str = ""
    email_from: str = "DisputeShield <alerts@disputeshield.com>"

    # Frontend
    frontend_url: str = "http://localhost:3000"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
