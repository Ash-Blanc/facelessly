"""Database setup and models for Faceless Video Factory."""

import sqlite3
from contextlib import asynccontextmanager
from typing import Any

import aiosqlite

DATABASE_PATH = "faceless.db"


async def init_db():
    """Initialize database tables."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # ─── Core Tables ───────────────────────────────────────────

        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                youtube_channel_id TEXT UNIQUE,
                channel_name TEXT,
                channel_picture TEXT,
                access_token TEXT,
                refresh_token TEXT,
                token_expires_at DATETIME,
                tier TEXT DEFAULT 'free',
                timezone TEXT DEFAULT 'UTC',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS connected_accounts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                platform TEXT NOT NULL,
                platform_user_id TEXT,
                platform_username TEXT,
                access_token TEXT,
                refresh_token TEXT,
                token_expires_at DATETIME,
                status TEXT DEFAULT 'connected',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, platform)
            )
        """)

        # ─── Project Tables ────────────────────────────────────────

        await db.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                title TEXT NOT NULL,
                niche TEXT,
                style TEXT,
                template TEXT,
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

        # ─── Pipeline & Scheduling ─────────────────────────────────

        await db.execute("""
            CREATE TABLE IF NOT EXISTS pipelines (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                niche TEXT NOT NULL,
                style TEXT NOT NULL,
                template TEXT DEFAULT 'top5_facts',
                platforms TEXT DEFAULT 'youtube',
                frequency TEXT DEFAULT 'daily',
                posting_times TEXT DEFAULT '09:00',
                timezone TEXT DEFAULT 'UTC',
                days_of_week TEXT DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
                auto_approve INTEGER DEFAULT 0,
                enabled INTEGER DEFAULT 1,
                last_run_at DATETIME,
                next_run_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS schedules (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                niche TEXT NOT NULL,
                style TEXT NOT NULL,
                platforms TEXT DEFAULT 'youtube',
                frequency TEXT DEFAULT 'daily',
                enabled INTEGER DEFAULT 1,
                last_run_at DATETIME,
                next_run_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # ─── Content & Posting Jobs ────────────────────────────────

        await db.execute("""
            CREATE TABLE IF NOT EXISTS content_jobs (
                id TEXT PRIMARY KEY,
                pipeline_id TEXT,
                template_id TEXT,
                niche_id TEXT,
                style_id TEXT,
                for_date TEXT NOT NULL,
                script TEXT,
                title TEXT,
                description TEXT,
                hashtags TEXT,
                status TEXT DEFAULT 'pending',
                error TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS post_jobs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                project_id TEXT,
                video_url TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                hashtags TEXT,
                platforms TEXT DEFAULT 'youtube',
                scheduled_at DATETIME,
                status TEXT DEFAULT 'queued',
                retries INTEGER DEFAULT 0,
                result TEXT,
                error TEXT,
                posted_at DATETIME,
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
