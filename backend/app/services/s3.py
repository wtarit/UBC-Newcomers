import uuid
from functools import lru_cache

import boto3
from botocore.config import Config

from app.config import settings


@lru_cache
def _client():
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        endpoint_url=settings.s3_endpoint_url,
        config=Config(signature_version="s3v4"),
    )


def generate_presigned_upload_url(content_type: str = "image/jpeg") -> tuple[str, str]:
    file_key = f"profile-pictures/{uuid.uuid4()}"
    url = _client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.s3_bucket_name,
            "Key": file_key,
            "ContentType": content_type,
        },
        ExpiresIn=300,
    )
    return url, file_key


def delete_object(file_key: str) -> None:
    _client().delete_object(Bucket=settings.s3_bucket_name, Key=file_key)


def public_url(file_key: str) -> str:
    return f"{settings.s3_endpoint_url}/{settings.s3_bucket_name}/{file_key}"
