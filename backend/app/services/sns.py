import json
from functools import lru_cache

import boto3
from botocore.exceptions import ClientError

from app.config import settings


@lru_cache
def _client():
    return boto3.client("sns", region_name=settings.aws_region)


def send_push_notification(device_token: str, title: str, body: str) -> bool:
    if not settings.sns_platform_app_arn:
        return False

    try:
        endpoint_response = _client().create_platform_endpoint(
            PlatformApplicationArn=settings.sns_platform_app_arn,
            Token=device_token,
        )
        endpoint_arn = endpoint_response["EndpointArn"]

        message = json.dumps({
            "default": body,
            "APNS": json.dumps({"aps": {"alert": {"title": title, "body": body}, "sound": "default"}}),
            "GCM": json.dumps({"notification": {"title": title, "body": body}}),
        })

        _client().publish(
            TargetArn=endpoint_arn,
            Message=message,
            MessageStructure="json",
        )
        return True
    except ClientError:
        return False
