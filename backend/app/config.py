from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+asyncpg://ubcadmin:NewcomersDB2026!@localhost:5432/ubcnewcomers"
    )

    aws_region: str = "us-west-2"
    s3_bucket_name: str = ""
    s3_endpoint_url: str = "https://s3.us-west-2.amazonaws.com"
    sns_platform_app_arn: str = ""

    firebase_credentials_path: str = ""
    firebase_project_id: str = ""

    bedrock_model_id: str = "anthropic.claude-sonnet-4-6"

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_sender_email: str = ""
    otp_expiry_minutes: int = 10
    otp_max_attempts: int = 5
    otp_rate_limit_per_15min: int = 3

    cors_allowed_origins: list[str] = [
        "http://localhost:8081",  # Expo web dev server
    ]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
