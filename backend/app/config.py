from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://ubcadmin:NewcomersDB2026!@localhost:5432/ubcnewcomers"

    aws_region: str = "us-west-2"
    cognito_user_pool_id: str = "us-west-2_Cb7YyLReb"
    cognito_app_client_id: str = "7qnnl3dtml6c1p7u41upjarc1b"
    s3_bucket_name: str = "ubc-newcomers-profile-pics-840765342118"
    sns_platform_app_arn: str = ""

    bedrock_model_id: str = "anthropic.claude-sonnet-4-6"

    test_allowed_emails: list[str] = ["tarit.witworrasakul@gmail.com"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
