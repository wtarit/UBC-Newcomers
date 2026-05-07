import uuid
from functools import lru_cache

import boto3
from botocore.config import Config

from app.config import settings


@lru_cache
def _client():
    return boto3.client("s3", region_name=settings.aws_region, config=Config(signature_version="s3v4"))


def generate_presigned_upload_url(user_id: uuid.UUID, content_type: str = "image/jpeg") -> tuple[str, str]:
    file_key = f"profile-pictures/{user_id}/{uuid.uuid4()}"
    url = _client().generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": file_key, "ContentType": content_type},
        ExpiresIn=300,
    )
    return url, file_key


def generate_presigned_download_url(file_key: str) -> str:
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": file_key},
        ExpiresIn=3600,
    )
