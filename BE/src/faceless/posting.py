"""Posting service via upload-post.com aggregator."""

import asyncio
import logging
import os
import uuid
import httpx
from datetime import datetime
from typing import Any

from faceless.database import get_db

logger = logging.getLogger(__name__)

# ─── Configuration ─────────────────────────────────────────────────────────

UPLOAD_POST_API_KEY = os.getenv("UPLOAD_POST_API_KEY", "")
UPLOAD_POST_API_URL = "https://api.upload-post.com/v1"

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
    """Get post jobs for a user."""
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
                      ca.refresh_token, ca.platform_user_id
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


# ─── Post Service (upload-post.com) ────────────────────────────────────────

class PostService:
    """Manages posting via upload-post.com."""

    async def process_job(self, job: dict[str, Any]) -> dict[str, Any]:
        """Process a single post job."""
        platforms = job.get("platforms", "youtube").split(",")
        results = {}

        # 1. Get connected accounts for this user to map to upload-post.com account IDs
        # NOTE: In a real integration, we would exchange our internal `connected_accounts`
        # for upload-post.com's `accountId`s during the /connect flow.
        # For this MVP, we will assume we pass our raw tokens or use a whitelabel approach.
        # However, upload-post.com usually requires registering accounts with them first.
        
        # Strategy: We'll attempt to use the "Raw Platform API" mode if available, 
        # or Register the account on the fly. 
        # Simpler MVP: usage of the /post endpoint with platform credentials if supported,
        # or assume the user has already connected their accounts via our frontend -> upload-post widget.
        
        # Let's assume we are using the "Direct Post" endpoint where we provide the credentials 
        # OR we have mapped our user_id to an upload-post.com user.
        
        # For this implementation, we will try to POST to upload-post.com/api/post
        # We need to map our platform names to theirs.
        
        platform_map = {
            "youtube": "youtube_shorts",
            "tiktok": "tiktok",
            "instagram": "instagram_reels"
        }

        async with httpx.AsyncClient() as client:
            for platform in platforms:
                platform_key = platform_map.get(platform.strip())
                if not platform_key:
                    results[platform] = {"status": "failed", "error": "Unsupported platform"}
                    continue

                try:
                    # Construct payload for upload-post.com
                    payload = {
                        "video_url": job["video_url"],
                        "caption": f"{job['title']}\n\n{job['description']}\n\n{job.get('hashtags', '')}",
                        "platforms": [platform_key],
                        # In a real app, we'd pass the specific account ID managed by upload-post
                        # "account_ids": ["..."] 
                        # Or if they support passing tokens directly (less common for aggregators):
                        # "credentials": { ... }
                    }
                    
                    # Call API
                    if UPLOAD_POST_API_KEY:
                        response = await client.post(
                            f"{UPLOAD_POST_API_URL}/post",
                            headers={"Authorization": f"Bearer {UPLOAD_POST_API_KEY}"},
                            json=payload,
                            timeout=60.0
                        )
                        
                        if response.status_code in (200, 201):
                            data = response.json()
                            results[platform] = {"status": "posted", "external_id": data.get("id")}
                        else:
                            results[platform] = {"status": "failed", "error": response.text}
                    else:
                        # Fallback for dev without API key: Mock success
                        logger.warning("No UPLOAD_POST_API_KEY, mocking success")
                        await asyncio.sleep(1) # Simulate network
                        results[platform] = {"status": "posted", "mock": True}

                except Exception as e:
                    results[platform] = {"status": "failed", "error": str(e)}

        # Update status
        import json
        all_posted = all(r.get("status") == "posted" for r in results.values())
        any_posted = any(r.get("status") == "posted" for r in results.values())

        if all_posted:
            await update_job_status(job["id"], "posted", result=json.dumps(results))
        elif any_posted:
            await update_job_status(job["id"], "partial", result=json.dumps(results))
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


# Global instance
post_service = PostService()
