"""Upload tools for posting videos to social platforms.

YouTube upload is functional (requires Google API credentials).
TikTok and Instagram are scaffolded for future implementation.
"""

import os
import json
from typing import Any


async def upload_to_youtube(
    video_path: str,
    title: str,
    description: str,
    tags: list[str] | None = None,
    access_token: str | None = None,
) -> dict[str, Any]:
    """Upload a video to YouTube using the YouTube Data API v3.

    Requires:
        - google-api-python-client and google-auth packages
        - Valid OAuth2 access_token with youtube.upload scope

    Args:
        video_path: Local path to the video file.
        title: Video title.
        description: Video description.
        tags: Optional list of tags.
        access_token: YouTube OAuth2 access token.

    Returns:
        Dict with video ID and URL on success, or error info.
    """
    if not access_token:
        return {"error": "No YouTube access token provided. Connect YouTube first."}

    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
        from google.oauth2.credentials import Credentials

        credentials = Credentials(token=access_token)
        youtube = build("youtube", "v3", credentials=credentials)

        body = {
            "snippet": {
                "title": title,
                "description": description,
                "tags": tags or [],
                "categoryId": "22",  # People & Blogs
            },
            "status": {
                "privacyStatus": "public",
                "selfDeclaredMadeForKids": False,
            },
        }

        media = MediaFileUpload(
            video_path,
            mimetype="video/mp4",
            resumable=True,
        )

        request = youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media,
        )

        response = request.execute()
        video_id = response.get("id")

        return {
            "platform": "youtube",
            "video_id": video_id,
            "url": f"https://youtube.com/shorts/{video_id}",
            "status": "uploaded",
        }

    except ImportError:
        return {
            "error": "google-api-python-client not installed. Run: pip install google-api-python-client google-auth",
            "platform": "youtube",
            "status": "failed",
        }
    except Exception as e:
        return {
            "error": str(e),
            "platform": "youtube",
            "status": "failed",
        }


async def upload_to_tiktok(
    video_path: str,
    title: str,
    description: str,
    access_token: str | None = None,
) -> dict[str, Any]:
    """Upload a video to TikTok.

    SCAFFOLDED - Requires TikTok Content Posting API access.
    See: https://developers.tiktok.com/doc/content-posting-api/

    Args:
        video_path: Local path to the video file.
        title: Video title/caption.
        description: Video description.
        access_token: TikTok OAuth2 access token.

    Returns:
        Dict with upload status.
    """
    # TODO: Implement TikTok Content Posting API
    # 1. POST /v2/post/publish/video/init/ to get upload URL
    # 2. Upload video binary to the upload URL
    # 3. POST /v2/post/publish/video/complete/ to finalize
    return {
        "platform": "tiktok",
        "status": "not_configured",
        "message": "TikTok API integration coming soon. Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET to .env",
    }


async def upload_to_instagram(
    video_path: str,
    caption: str,
    access_token: str | None = None,
) -> dict[str, Any]:
    """Upload a Reel to Instagram.

    SCAFFOLDED - Requires Instagram Graph API / Content Publishing API.
    See: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing

    Args:
        video_path: Local path to the video file.
        caption: Reel caption.
        access_token: Instagram/Meta access token.

    Returns:
        Dict with upload status.
    """
    # TODO: Implement Instagram Content Publishing API
    # 1. POST /{ig-user-id}/media to create a media container
    # 2. Wait for processing
    # 3. POST /{ig-user-id}/media_publish to publish
    return {
        "platform": "instagram",
        "status": "not_configured",
        "message": "Instagram Reels integration coming soon. Add META_APP_ID and META_APP_SECRET to .env",
    }


async def upload_to_platforms(
    video_path: str,
    title: str,
    description: str,
    platforms: list[str],
    tokens: dict[str, str | None] | None = None,
) -> list[dict[str, Any]]:
    """Upload a video to multiple platforms.

    Args:
        video_path: Local path to the video file.
        title: Video title.
        description: Video description.
        platforms: List of platform names (youtube, tiktok, instagram).
        tokens: Dict mapping platform name to access token.

    Returns:
        List of upload results per platform.
    """
    tokens = tokens or {}
    results = []

    for platform in platforms:
        if platform == "youtube":
            result = await upload_to_youtube(
                video_path, title, description,
                access_token=tokens.get("youtube"),
            )
        elif platform == "tiktok":
            result = await upload_to_tiktok(
                video_path, title, description,
                access_token=tokens.get("tiktok"),
            )
        elif platform == "instagram":
            result = await upload_to_instagram(
                video_path, f"{title}\n\n{description}",
                access_token=tokens.get("instagram"),
            )
        else:
            result = {"platform": platform, "status": "unknown_platform"}

        results.append(result)

    return results
