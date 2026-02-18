"""Posting service for multi-platform video distribution.

Manages post jobs with retry logic and per-platform adapters.
YouTube: functional via Data API v3
TikTok: scaffolded (Content Posting API)
Instagram: scaffolded (Graph API)
"""

import asyncio
import logging
import os
import uuid
from datetime import datetime
from typing import Any

import httpx

from faceless.database import get_db

logger = logging.getLogger(__name__)

# ─── Configuration ─────────────────────────────────────────────────────────

MAX_RETRIES = 3
RETRY_DELAYS = [60, 300, 900]  # 1min, 5min, 15min


# ─── PostJob helpers ───────────────────────────────────────────────────────

async def create_post_job(
    user_id: str,
    video_url: str,
    title: str,
    description: str,
    hashtags: str = "",
    platforms: str = "youtube",
    scheduled_at: str | None = None,
    project_id: str | None = None,
) -> dict[str, Any]:
    """Create a new post job in the database."""
    job_id = f"post_{uuid.uuid4().hex[:12]}"

    async with get_db() as db:
        await db.execute(
            """INSERT INTO post_jobs
               (id, user_id, video_url, title, description, hashtags,
                platforms, scheduled_at, project_id, status, retries)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 0)""",
            (job_id, user_id, video_url, title, description, hashtags,
             platforms, scheduled_at, project_id),
        )

    return {
        "id": job_id,
        "user_id": user_id,
        "video_url": video_url,
        "title": title,
        "platforms": platforms,
        "status": "queued",
    }


async def get_post_jobs(user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    """Get post jobs for a user, most recent first."""
    async with get_db() as db:
        async with db.execute(
            """SELECT * FROM post_jobs WHERE user_id = ?
               ORDER BY created_at DESC LIMIT ?""",
            (user_id, limit),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def get_pending_jobs() -> list[dict[str, Any]]:
    """Get all jobs that are due to be posted."""
    now = datetime.now().isoformat()
    async with get_db() as db:
        async with db.execute(
            """SELECT pj.*, ca.platform as account_platform, ca.access_token,
                      ca.refresh_token
               FROM post_jobs pj
               LEFT JOIN connected_accounts ca
                 ON pj.user_id = ca.user_id
               WHERE pj.status IN ('queued', 'retrying')
                 AND (pj.scheduled_at IS NULL OR pj.scheduled_at <= ?)
               ORDER BY pj.created_at ASC""",
            (now,),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def update_job_status(
    job_id: str, status: str, error: str | None = None, result: str | None = None
):
    """Update a post job's status."""
    async with get_db() as db:
        await db.execute(
            """UPDATE post_jobs
               SET status = ?, error = ?, result = ?,
                   posted_at = CASE WHEN ? = 'posted' THEN CURRENT_TIMESTAMP ELSE posted_at END,
                   retries = CASE WHEN ? = 'retrying' THEN retries + 1 ELSE retries END,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?""",
            (status, error, result, status, status, job_id),
        )


# ─── Platform Adapters ────────────────────────────────────────────────────

async def _post_youtube(
    video_url: str, title: str, description: str, hashtags: str,
    access_token: str | None = None, **kwargs
) -> dict[str, Any]:
    """Post to YouTube Shorts via Data API v3."""
    if not access_token:
        return {"status": "failed", "error": "No YouTube access token"}

    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
        from google.oauth2.credentials import Credentials

        credentials = Credentials(token=access_token)
        youtube = build("youtube", "v3", credentials=credentials)

        tags = [h.strip("#") for h in hashtags.split(",") if h.strip()] if hashtags else []

        body = {
            "snippet": {
                "title": title,
                "description": f"{description}\n\n{hashtags}",
                "tags": tags,
                "categoryId": "22",
            },
            "status": {
                "privacyStatus": "public",
                "selfDeclaredMadeForKids": False,
            },
        }

        # Download video from URL to temp file
        async with httpx.AsyncClient() as client:
            resp = await client.get(video_url, timeout=120.0)
            temp_path = f"/tmp/yt_upload_{uuid.uuid4().hex[:8]}.mp4"
            with open(temp_path, "wb") as f:
                f.write(resp.content)

        media = MediaFileUpload(temp_path, mimetype="video/mp4", resumable=True)
        request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
        response = request.execute()
        video_id = response.get("id")

        # Clean up temp file
        os.remove(temp_path)

        return {
            "status": "posted",
            "platform": "youtube",
            "video_id": video_id,
            "url": f"https://youtube.com/shorts/{video_id}",
        }

    except ImportError:
        return {"status": "failed", "error": "google-api-python-client not installed"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


async def _post_tiktok(
    video_url: str, title: str, description: str, hashtags: str,
    access_token: str | None = None, **kwargs
) -> dict[str, Any]:
    """Post to TikTok via Content Posting API.

    Scaffolded — requires TikTok developer app with Content Posting scope.
    See: https://developers.tiktok.com/doc/content-posting-api/
    """
    if not access_token:
        return {"status": "failed", "error": "No TikTok access token. Connect TikTok first."}

    try:
        async with httpx.AsyncClient() as client:
            # Step 1: Initialize upload
            init_resp = await client.post(
                "https://open.tiktokapis.com/v2/post/publish/video/init/",
                headers={"Authorization": f"Bearer {access_token}",
                         "Content-Type": "application/json"},
                json={
                    "post_info": {
                        "title": f"{title} {hashtags}",
                        "privacy_level": "PUBLIC",
                    },
                    "source_info": {
                        "source": "PULL_FROM_URL",
                        "video_url": video_url,
                    },
                },
                timeout=30.0,
            )
            data = init_resp.json()

            if init_resp.status_code == 200 and data.get("data", {}).get("publish_id"):
                return {
                    "status": "posted",
                    "platform": "tiktok",
                    "publish_id": data["data"]["publish_id"],
                }

            return {"status": "failed", "error": data.get("error", {}).get("message", "Unknown error")}

    except Exception as e:
        return {"status": "failed", "error": str(e)}


async def _post_instagram(
    video_url: str, title: str, description: str, hashtags: str,
    access_token: str | None = None, **kwargs
) -> dict[str, Any]:
    """Post Reel to Instagram via Graph API.

    Scaffolded — requires Meta app with Instagram Content Publishing permission.
    See: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing
    """
    if not access_token:
        return {"status": "failed", "error": "No Instagram access token. Connect Instagram first."}

    ig_user_id = kwargs.get("ig_user_id")
    if not ig_user_id:
        return {"status": "failed", "error": "Instagram user ID not found"}

    try:
        async with httpx.AsyncClient() as client:
            # Step 1: Create media container
            create_resp = await client.post(
                f"https://graph.facebook.com/v19.0/{ig_user_id}/media",
                params={
                    "media_type": "REELS",
                    "video_url": video_url,
                    "caption": f"{title}\n\n{description}\n\n{hashtags}",
                    "access_token": access_token,
                },
                timeout=30.0,
            )
            container = create_resp.json()
            container_id = container.get("id")

            if not container_id:
                return {"status": "failed", "error": container.get("error", {}).get("message", "Failed to create container")}

            # Step 2: Wait for processing then publish
            await asyncio.sleep(10)  # Wait for processing

            publish_resp = await client.post(
                f"https://graph.facebook.com/v19.0/{ig_user_id}/media_publish",
                params={
                    "creation_id": container_id,
                    "access_token": access_token,
                },
                timeout=30.0,
            )
            result = publish_resp.json()

            if result.get("id"):
                return {
                    "status": "posted",
                    "platform": "instagram",
                    "media_id": result["id"],
                }

            return {"status": "failed", "error": result.get("error", {}).get("message", "Publish failed")}

    except Exception as e:
        return {"status": "failed", "error": str(e)}


PLATFORM_ADAPTERS = {
    "youtube": _post_youtube,
    "tiktok": _post_tiktok,
    "instagram": _post_instagram,
}


# ─── Post Service ──────────────────────────────────────────────────────────

class PostService:
    """Manages posting jobs across platforms with retries."""

    async def process_job(self, job: dict[str, Any]) -> dict[str, Any]:
        """Process a single post job across all its platforms."""
        platforms = job.get("platforms", "youtube").split(",")
        results = {}

        # Get user's connected accounts for tokens
        tokens = await self._get_user_tokens(job["user_id"])

        for platform in platforms:
            platform = platform.strip()
            adapter = PLATFORM_ADAPTERS.get(platform)

            if not adapter:
                results[platform] = {"status": "failed", "error": f"Unknown platform: {platform}"}
                continue

            token = tokens.get(platform, {}).get("access_token")
            result = await adapter(
                video_url=job["video_url"],
                title=job["title"],
                description=job["description"],
                hashtags=job.get("hashtags", ""),
                access_token=token,
                ig_user_id=tokens.get("instagram", {}).get("platform_user_id"),
            )
            results[platform] = result

        # Determine overall status
        all_posted = all(r.get("status") == "posted" for r in results.values())
        any_posted = any(r.get("status") == "posted" for r in results.values())

        import json
        if all_posted:
            await update_job_status(job["id"], "posted", result=json.dumps(results))
        elif any_posted:
            await update_job_status(job["id"], "partial", result=json.dumps(results))
        elif job.get("retries", 0) < MAX_RETRIES:
            await update_job_status(job["id"], "retrying", error=json.dumps(results))
        else:
            await update_job_status(job["id"], "failed", error=json.dumps(results))

        return results

    async def process_pending(self):
        """Process all pending post jobs."""
        jobs = await get_pending_jobs()
        for job in jobs:
            try:
                await self.process_job(job)
            except Exception as e:
                logger.error(f"Failed to process job {job['id']}: {e}")
                await update_job_status(job["id"], "failed", error=str(e))

    async def _get_user_tokens(self, user_id: str) -> dict[str, dict]:
        """Get all connected account tokens for a user."""
        tokens = {}
        async with get_db() as db:
            async with db.execute(
                "SELECT * FROM connected_accounts WHERE user_id = ? AND status = 'connected'",
                (user_id,),
            ) as cursor:
                rows = await cursor.fetchall()
                for row in rows:
                    row_dict = dict(row)
                    tokens[row_dict["platform"]] = row_dict
        return tokens


# Global instance
post_service = PostService()
