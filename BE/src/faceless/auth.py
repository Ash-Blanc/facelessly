"""YouTube OAuth authentication handlers."""

import os
import uuid
from datetime import datetime
from typing import Any

import httpx

from faceless.database import get_db

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


def get_authorization_url(state: str) -> str:
    """Generate YouTube OAuth authorization URL."""
    client_id = os.getenv("YOUTUBE_CLIENT_ID")
    redirect_uri = os.getenv("YOUTUBE_REDIRECT_URI", "http://localhost:8000/auth/callback")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/youtube.readonly",
        "access_type": "offline",
        "state": state,
    }
    return f"{AUTH_URL}?{'&'.join(f'{k}={v}' for k, v in params.items())}"


async def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    """Exchange authorization code for access/refresh tokens."""
    client_id = os.getenv("YOUTUBE_CLIENT_ID")
    client_secret = os.getenv("YOUTUBE_CLIENT_SECRET")
    redirect_uri = os.getenv("YOUTUBE_REDIRECT_URI", "http://localhost:8000/auth/callback")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
        )
        response.raise_for_status()
        return response.json()


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    """Refresh expired access token."""
    client_id = os.getenv("YOUTUBE_CLIENT_ID")
    client_secret = os.getenv("YOUTUBE_CLIENT_SECRET")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        return response.json()


async def get_channel_data(access_token: str) -> dict[str, Any] | None:
    """Fetch YouTube channel data."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{YOUTUBE_API_BASE}/channels",
            params={"part": "snippet,statistics", "mine": "true"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        data = response.json()
        if data.get("items"):
            return data["items"][0]
        return None


async def save_user(user_data: dict[str, Any]) -> str:
    """Save or update user in database."""
    user_id = user_data.get("id", str(uuid.uuid4()))

    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO users (id, youtube_channel_id, channel_name, channel_picture,
                            access_token, refresh_token, token_expires_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(youtube_channel_id) DO UPDATE SET
                channel_name = excluded.channel_name,
                channel_picture = excluded.channel_picture,
                access_token = excluded.access_token,
                refresh_token = excluded.refresh_token,
                token_expires_at = excluded.token_expires_at,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                user_id,
                user_data.get("youtube_channel_id"),
                user_data.get("channel_name"),
                user_data.get("channel_picture"),
                user_data.get("access_token"),
                user_data.get("refresh_token"),
                user_data.get("token_expires_at"),
            ),
        )

    return user_id


async def get_user_by_channel(channel_id: str) -> dict[str, Any] | None:
    """Get user by YouTube channel ID."""
    async with get_db() as db:
        async with db.execute(
            "SELECT * FROM users WHERE youtube_channel_id = ?", (channel_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None
