"""Database setup and models for Faceless Video Factory."""

import sqlite3
from contextlib import asynccontextmanager
from typing import Any

import aiosqlite

DATABASE_PATH = "faceless.db"


async def init_db():
    """Initialize database tables."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                youtube_channel_id TEXT UNIQUE,
                channel_name TEXT,
                channel_picture TEXT,
                access_token TEXT,
                refresh_token TEXT,
                token_expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                title TEXT NOT NULL,
                status TEXT DEFAULT 'backlog',
                position INTEGER,
                selected_trend_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS trends (
                id TEXT PRIMARY KEY,
                project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                description TEXT,
                why_viral TEXT,
                competitive_analysis TEXT,
                sources TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS assets (
                id TEXT PRIMARY KEY,
                project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                url TEXT,
                prompt TEXT,
                metadata TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.commit()


@asynccontextmanager
async def get_db():
    """Get database connection context manager."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = sqlite3.Row
        yield db
        await db.commit()
