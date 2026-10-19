"""Upload media to a public S3-compatible bucket (Cloudflare R2 recommended) so Meta can fetch it.

Instagram's API only accepts media by public URL. Files are uploaded right before publishing
and can be deleted after 7 days with a bucket lifecycle rule.
"""
from __future__ import annotations

import mimetypes
import pathlib

from common import DRY_RUN, env, log


def public_url(local: pathlib.Path, post_id: str) -> str:
    key = f"posts/{post_id}/{local.name}"
    base = env("PUBLIC_MEDIA_BASE_URL").rstrip("/")
    if DRY_RUN:
        log(f"DRY_RUN upload {local.name} -> {base}/{key}")
        return f"{base}/{key}"

    import boto3  # imported here so dry runs and tests don't need it

    s3 = boto3.client(
        "s3",
        endpoint_url=env("S3_ENDPOINT"),
        aws_access_key_id=env("S3_ACCESS_KEY_ID"),
        aws_secret_access_key=env("S3_SECRET_ACCESS_KEY"),
        region_name="auto",
    )
    content_type = mimetypes.guess_type(local.name)[0] or "application/octet-stream"
    s3.upload_file(str(local), env("S3_BUCKET"), key, ExtraArgs={"ContentType": content_type})
    url = f"{base}/{key}"
    log(f"uploaded {local.name} -> {url}")
    return url
