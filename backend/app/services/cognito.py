from functools import lru_cache

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException

from app.config import settings


@lru_cache
def _client():
    return boto3.client("cognito-idp", region_name=settings.aws_region)


def validate_ubc_email(email: str) -> None:
    if email.lower() in [e.lower() for e in settings.test_allowed_emails]:
        return
    valid_domains = ["ubc.ca", "student.ubc.ca", "alumni.ubc.ca", "mail.ubc.ca"]
    domain = email.split("@")[1].lower()
    if not any(domain == d or domain.endswith(f".{d}") for d in valid_domains):
        raise HTTPException(status_code=400, detail="Only UBC email addresses (*.ubc.ca) are allowed")


def sign_up(email: str, password: str, full_name: str) -> str:
    validate_ubc_email(email)
    try:
        response = _client().sign_up(
            ClientId=settings.cognito_app_client_id,
            Username=email,
            Password=password,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "name", "Value": full_name},
            ],
        )
        return response["UserSub"]
    except ClientError as e:
        raise HTTPException(status_code=400, detail=e.response["Error"]["Message"])


def confirm_sign_up(email: str, confirmation_code: str) -> None:
    try:
        _client().confirm_sign_up(
            ClientId=settings.cognito_app_client_id,
            Username=email,
            ConfirmationCode=confirmation_code,
        )
    except ClientError as e:
        raise HTTPException(status_code=400, detail=e.response["Error"]["Message"])


def login(email: str, password: str) -> dict:
    try:
        response = _client().initiate_auth(
            ClientId=settings.cognito_app_client_id,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": email, "PASSWORD": password},
        )
        result = response["AuthenticationResult"]
        return {
            "access_token": result["AccessToken"],
            "refresh_token": result["RefreshToken"],
            "id_token": result["IdToken"],
        }
    except ClientError as e:
        raise HTTPException(status_code=401, detail=e.response["Error"]["Message"])


def refresh_token(refresh_tok: str) -> dict:
    try:
        response = _client().initiate_auth(
            ClientId=settings.cognito_app_client_id,
            AuthFlow="REFRESH_TOKEN_AUTH",
            AuthParameters={"REFRESH_TOKEN": refresh_tok},
        )
        result = response["AuthenticationResult"]
        return {
            "access_token": result["AccessToken"],
            "id_token": result["IdToken"],
        }
    except ClientError as e:
        raise HTTPException(status_code=401, detail=e.response["Error"]["Message"])


def forgot_password(email: str) -> None:
    try:
        _client().forgot_password(ClientId=settings.cognito_app_client_id, Username=email)
    except ClientError as e:
        raise HTTPException(status_code=400, detail=e.response["Error"]["Message"])


def confirm_forgot_password(email: str, confirmation_code: str, new_password: str) -> None:
    try:
        _client().confirm_forgot_password(
            ClientId=settings.cognito_app_client_id,
            Username=email,
            ConfirmationCode=confirmation_code,
            Password=new_password,
        )
    except ClientError as e:
        raise HTTPException(status_code=400, detail=e.response["Error"]["Message"])


def get_user_from_token(access_token: str) -> dict:
    try:
        response = _client().get_user(AccessToken=access_token)
        attrs = {a["Name"]: a["Value"] for a in response["UserAttributes"]}
        return {"sub": attrs["sub"], "email": attrs["email"], "name": attrs.get("name", "")}
    except ClientError as e:
        raise HTTPException(status_code=401, detail=e.response["Error"]["Message"])
