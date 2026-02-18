# FacelessReels — Master Implementation Plan

**Date:** 2026-02-18
**Status:** ⚠️ Phase 3A–6A Implemented, Phase 7–8 Pending

## Overview

Autopilot system for generating and daily-posting viral faceless short-form videos across TikTok, Instagram, and YouTube.

Core flow: **User inputs → Content pipeline → Video generation → Scheduling → Multi-platform posting**

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1. Product Spec & UX | Niche/style wizard, user stories | ✅ Done |
| 2. Tech Stack & Skeleton | Next.js + FastAPI + SQLite | ✅ Done |
| 3. Account Connection & Posting | OAuth + PostService + adapters | ✅ Done |
| 4. Content & Script Generation | Templates + LLM pipeline | ✅ Done |
| 5. Video Generation | Pollinations.ai integration | ✅ Done |
| 6. Scheduling & Automation | Pipelines + daily workflow + calendar | ✅ Done |
| 7. Onboarding, Pricing, Guardrails | Tiers, limits, safety filters | ❌ Pending |
| 8. Analytics & Growth | Views tracking, A/B hooks | ❌ Pending |

## What Was Built

### Phase 3A: Posting Layer
- **`posting.py`**: `PostService` with `create_post_job`, `get_post_jobs`, `get_pending_jobs`, `update_job_status`
- Platform adapters: YouTube (functional), TikTok (Content Posting API), Instagram (Graph API)
- Retry logic: 3 retries with exponential backoff (1min → 5min → 15min)
- Video download from URL before YouTube upload

### Phase 4A: Content Templates
- **`templates.py`**: 6 built-in templates with structured sections, durations, and LLM prompt generation
- Templates: Top 5 Facts, Myth vs Fact, X Tips for Y, Daily Quote, Story Time, Did You Know
- Niche tagging: each template tagged to compatible niches
- Content job model for scheduled generation

### Phase 6A: Scheduling & Pipelines
- **`workflow.py`**: Pipeline-based scheduling replacing legacy schedule-only approach
- Pipeline model: niche + style + template + platforms + frequency + timezone + posting times + days of week
- Rolling 7-day schedule generation
- `DailyVideoWorkflow` auto-starts/stops with server lifecycle

### Database Schema (8 tables)
- `users` — with tier and timezone
- `connected_accounts` — per-platform OAuth tokens
- `projects` — with template column
- `trends`, `assets` — project attachments
- `pipelines` — full pipeline configuration
- `content_jobs` — scheduled content generation
- `post_jobs` — queued posts with retry tracking

### API Endpoints Added
- `GET /templates`, `GET /templates/{id}`
- `GET/POST/PATCH/DELETE /pipelines`
- `POST /posts/queue`, `GET /posts/{user_id}`
- `GET /calendar/{user_id}`
- `GET /accounts/{user_id}`, `DELETE /accounts/{user_id}/{platform}`

### Frontend: Calendar Page
- Monthly grid with per-day status indicators
- Color-coded chips: posted (green), queued (blue), retrying (yellow), failed (red), generating (purple)
- Platform emoji markers (📺 YouTube, 🎵 TikTok, 📸 Instagram)
- Click day → detail panel with full post/content job info

## Remaining Work

### Phase 7: Onboarding & SaaS
- [ ] User tier system (free: 1 pipeline/1 video/day, paid: unlimited)
- [ ] Stripe billing integration
- [ ] Content safety filters
- [ ] Terms of service and privacy policy
- [ ] Watermark on free-tier videos

### Phase 8: Analytics
- [ ] Pull views/likes/comments from platform APIs
- [ ] Store per-post analytics
- [ ] A/B hook testing across pipelines
- [ ] Template marketplace for sharing high-performing configs

### Platform APIs (Production-Ready)
- [ ] TikTok Content Posting API: get developer app approval
- [ ] Instagram Graph API: configure Meta business app
- [ ] Token refresh automation for all platforms

### Infrastructure
- [ ] SQLite → Postgres migration
- [ ] Local storage → S3/MinIO for video assets
- [ ] Celery/BullMQ workers for heavy video processing
- [ ] n8n integration for advanced posting workflows
