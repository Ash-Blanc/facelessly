"""Analytics module - pull YouTube data, compute metrics, A/B test variants."""

import os
import uuid
from datetime import datetime, timedelta
from typing import Any

import httpx

from faceless.database import get_db

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
YOUTUBE_ANALYTICS_BASE = "https://youtubeanalytics.googleapis.com/v2"


async def get_channel_analytics(user_id: str, days: int = 28) -> dict[str, Any]:
    """Pull YouTube analytics for the last N days via the YouTube Analytics API."""
    async with get_db() as db:
        async with db.execute(
            "SELECT access_token, youtube_channel_id FROM users WHERE id = ?", (user_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if not row or not row["access_token"]:
                return {"error": "No YouTube account connected"}

    access_token = row["access_token"]
    channel_id = row["youtube_channel_id"]

    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{YOUTUBE_ANALYTICS_BASE}/reports",
                params={
                    "ids": f"channel=={channel_id}",
                    "startDate": str(start_date),
                    "endDate": str(end_date),
                    "metrics": "views,estimatedMinutesWatched,averageViewDuration,subscribersGained,likes,comments",
                    "dimensions": "day",
                    "sort": "day",
                },
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=15,
            )
            if resp.status_code != 200:
                # Return mock data if API unavailable (no credentials yet)
                return _mock_analytics(days)

            data = resp.json()
            return _format_analytics(data, days)
    except Exception:
        return _mock_analytics(days)


def _mock_analytics(days: int) -> dict[str, Any]:
    """Return realistic mock data when YouTube API is not connected."""
    import random
    dates = [(datetime.utcnow().date() - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]
    return {
        "mock": True,
        "message": "Connect YouTube to see real analytics",
        "summary": {
            "views": random.randint(1200, 8000),
            "watch_minutes": random.randint(3000, 25000),
            "subscribers_gained": random.randint(20, 300),
            "likes": random.randint(150, 1200),
            "avg_view_duration_sec": random.randint(20, 55),
        },
        "daily": [
            {
                "date": d,
                "views": random.randint(30, 500),
                "watch_minutes": random.randint(60, 1500),
                "subscribers_gained": random.randint(0, 15),
                "likes": random.randint(2, 50),
            }
            for d in dates
        ],
        "top_videos": [
            {"title": "5 Scary Stories That Will Keep You Up All Night", "views": 12400, "likes": 890},
            {"title": "The Mystery of the Abandoned Island", "views": 8700, "likes": 560},
            {"title": "True Crime: The Disappearance of Maria K", "views": 6200, "likes": 430},
        ],
    }


def _format_analytics(raw: dict, days: int) -> dict[str, Any]:
    """Format raw YouTube Analytics API response."""
    rows = raw.get("rows", [])
    col_headers = [h["name"] for h in raw.get("columnHeaders", [])]
    daily = []
    totals: dict[str, int] = {}

    for row in rows:
        entry = dict(zip(col_headers, row))
        daily.append({
            "date": entry.get("day"),
            "views": int(entry.get("views", 0)),
            "watch_minutes": int(entry.get("estimatedMinutesWatched", 0)),
            "subscribers_gained": int(entry.get("subscribersGained", 0)),
            "likes": int(entry.get("likes", 0)),
        })
        for k, v in entry.items():
            if k != "day":
                totals[k] = totals.get(k, 0) + (int(v) if str(v).isdigit() else 0)

    avg_dur = totals.get("averageViewDuration", 0)
    return {
        "mock": False,
        "summary": {
            "views": totals.get("views", 0),
            "watch_minutes": totals.get("estimatedMinutesWatched", 0),
            "subscribers_gained": totals.get("subscribersGained", 0),
            "likes": totals.get("likes", 0),
            "avg_view_duration_sec": avg_dur,
        },
        "daily": daily,
    }


async def score_hook(script: str) -> dict[str, Any]:
    """Score the hook strength (first 3 sentences) using the LLM.
    Returns score 1-10 and feedback.
    """
    # Extract hook (first 3 sentences)
    sentences = [s.strip() for s in script.replace("\n", " ").split(".") if s.strip()]
    hook = ". ".join(sentences[:3]) + "."

    try:
        from faceless.agents import create_faceless_team
        team = create_faceless_team()
        prompt = (
            f"Rate this YouTube Shorts hook on a scale of 1-10 for viewer retention.\n\n"
            f'Hook: "{hook}"\n\n'
            "Respond in this exact JSON format:\n"
            '{"score": 8, "grade": "B+", "strengths": ["..."], "improvements": ["..."], '
            '"estimated_retention": "65%"}'
        )
        response = team.run(prompt)
        content = str(response.content) if response else ""

        import json, re
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            result = json.loads(match.group())
            return {"hook": hook, **result}
    except Exception:
        pass

    # Heuristic fallback
    words = len(hook.split())
    score = min(10, max(1, 5 + (1 if words < 25 else 0) + (1 if "?" in hook else 0) + (1 if any(w in hook.lower() for w in ["secret", "shocking", "never", "always", "most"]) else 0)))
    return {
        "hook": hook,
        "score": score,
        "grade": ["F", "D", "D+", "C", "C+", "B-", "B", "B+", "A-", "A", "A+"][score],
        "strengths": ["Opens with a statement" if words < 20 else "Moderate length"],
        "improvements": ["Add a question or surprising fact", "Use power words (shocking, secret, never)"],
        "estimated_retention": f"{score * 8}%",
    }


async def create_variant(project_id: str, user_id: str, variant_data: dict) -> dict:
    """Create a script/hook variant for A/B testing."""
    variant_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """INSERT INTO assets (id, project_id, type, prompt, metadata, status, created_at, updated_at)
               VALUES (?, ?, 'script', ?, ?, 'ready', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)""",
            (
                variant_id,
                project_id,
                variant_data.get("script", ""),
                f'{{"variant": true, "label": "{variant_data.get("label", "Variant B")}"}}',
            ),
        )
        await db.commit()
    return {"id": variant_id, "project_id": project_id, **variant_data}


async def get_variants(project_id: str) -> list[dict]:
    """Get all script variants for a project."""
    async with get_db() as db:
        async with db.execute(
            """SELECT id, prompt, metadata, status, created_at FROM assets
               WHERE project_id = ? AND type = 'script'""",
            (project_id,),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
