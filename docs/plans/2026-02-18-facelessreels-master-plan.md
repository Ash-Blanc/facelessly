# Facelessly — Master Plan (10/10 Production-Grade SaaS)

**Date:** 2026-02-18  
**Status:** 🏗️ Phases 1–6 Built, Phases 7–10 In Progress

## Vision

A market-competitive SaaS for generating and auto-posting faceless short-form videos across TikTok, Instagram, and YouTube. Users pick niche → voice → visuals → captions → connect socials → system auto-generates & schedules.

**Core Loop:** Series creation wizard → AI pipeline (script→voice→visual→merge→captions) → scheduling → multi-platform posting

---

## Core Features (MVP)

| Feature | Description |
|---------|-------------|
| **Auth** | Signup/login, YouTube OAuth, billing tier awareness |
| **Series Creation** | Choose niche preset or custom; pick language and AI voice |
| **Background Music** | Built-in royalty-free library (50-100 tracks); optional trend sound matcher |
| **Visuals** | Hybrid: stock + AI overlay (MVP), full text-to-video (premium) |
| **Captions** | Toggle auto-captions, choose caption style |
| **Social Connections** | YouTube (functional), TikTok/Instagram via upload-post.com |
| **Series Dashboard** | List series, upcoming videos, status, edit concept |
| **Video Preview** | Preview, download, or publish to connected accounts |

---

## Architecture & Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Framer Motion |
| **Backend API** | Python 3.13, FastAPI, uvicorn |
| **AI Pipeline** | Agno/AgentOS, Mistral AI (small + large), Pollinations.ai (video/audio/image) |
| **Task Queue** | Celery + Redis (broker + result backend) |
| **Database** | SQLite (dev) → PostgreSQL (prod) |
| **Storage** | Local (dev) → Cloudflare R2 / S3 (prod) |
| **Posting** | upload-post.com unified API |
| **Package Managers** | npm (FE), uv (BE) |

### AI Provider Strategy (2026)

| Role | Provider | Notes |
|------|----------|-------|
| Script/Hook/Ideation | Mistral Large | Pure reasoning, no tools |
| TTS | Pollinations.ai → ElevenLabs Turbo v2.5 (premium) | Emotion + lowest latency |
| Visuals (base) | Pollinations.ai + stock overlays | Cost-effective MVP |
| Visuals (premium) | Sora 2 / Kling 2.6 / Runway Gen-4.5 | Full text-to-video |
| Assembly | FFmpeg + MoviePy | Merge + captions burn-in |

---

## Data Model

| Table | Key Columns |
|-------|-------------|
| **users** | id, email, password_hash, credits, tier (free/pro/scale), timezone |
| **social_accounts** | id, user_id, platform, access_token, refresh_token, expires_at |
| **series** | id, user_id, niche, language, voice_id, art_style_id, caption_style_id, bg_music_url, status |
| **episodes** | id, series_id, script, scheduled_at, generated_at, status (queued/generating/ready/posted/failed), video_url |
| **presets** | Voice, ArtStyle, CaptionStyle presets with config JSON |
| **transactions** | id, user_id, amount, type, description |
| **pipelines** | id, user_id, niche, style, template, platforms, frequency, timezone |
| **content_jobs** | id, pipeline_id, scheduled_at, status |
| **post_jobs** | id, video_url, platforms, status, retry_count |

---

## Pricing Model (Hybrid Credits)

| Tier | Price | Credits/mo | Features |
|------|-------|-----------|----------|
| **Free** | $0 | 30 (~2 videos) | 1 pipeline, watermark, basic styles |
| **Basic** | $19/mo | 300 (~15-20 videos) | 3 pipelines, no watermark |
| **Pro** | $49/mo | 1,200 (~60–80 videos) | Unlimited pipelines, priority queue, premium voices |
| **Scale** | $99/mo | 3,000 | Custom voices/styles, API access |
| **Credits Pack** | $10 | 200 extra | Top-up anytime |

> Credits absorb provider cost fluctuations (Kling/Runway $0.8–$3/video).

---

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1. Product Spec & UX | Niche/style wizard, user stories | ✅ Done |
| 2. Tech Stack & Skeleton | Next.js + FastAPI + SQLite | ✅ Done |
| 3. Account Connection & Posting | OAuth + upload-post.com integration | ✅ Done |
| 4. Content & Script Gen | Templates + LLM pipeline | ✅ Done |
| 5. Video Generation | Pollinations.ai integration | ✅ Done |
| 6. Scheduling & Automation | Celery + Redis + pipelines + calendar | ✅ Done |
| 7. SaaS: Credits & Billing | Credit system, transactions, Stripe | 🔧 Partial (credits done, Stripe pending) |
| 8. Content Quality | Script preview, hook scoring, retention predictor | ❌ Pending |
| 9. Premium Video Gen | Hybrid stock+AI visuals, full generative tier | ❌ Pending |
| 10. Analytics & Growth | Views tracking, A/B hooks, trend scanner | ❌ Pending |

---

## What's Built

### Infrastructure (Phase 6 Upgrade)
- **Celery + Redis** task queue replacing in-process workflow loop
- `worker.py` — Celery app config with Redis broker
- `tasks.py` — `check_pipelines_task`, `generate_video_task`, `process_posts_task` with credit deduction
- `docker-compose.yml` — Redis container

### Posting Layer
- **upload-post.com** integration replacing per-platform adapters
- Platform mapping: youtube→YouTube, tiktok→TikTok, instagram→Instagram
- Job management with retry logic (3 retries, exponential backoff)

### Credit System (Phase 7 Partial)
- `credits` column on users table
- `transactions` table for audit trail
- Credit check + deduction in `generate_video_task`
- `GET /credits/{user_id}` API endpoint

### Database Schema (10 tables)
users, connected_accounts, projects, trends, assets, pipelines, content_jobs, post_jobs, transactions

### Frontend Pages
| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero + CTA |
| Generate Wizard | `/generate` | 4-step: niche → style → connect → generate |
| Calendar | `/calendar` | Monthly grid with status indicators |
| Dashboard | `/dashboard` | Project management |
| Connections | `/connect` | Platform OAuth management |
| Chat | `/chat` | AI agent interaction |

---

## Remaining Work

### Phase 7: SaaS Polish
- [ ] Stripe billing integration
- [ ] Credit top-up / monthly refresh flow
- [ ] Per-plan limits enforcement (max series, videos/day)
- [ ] Watermark on free-tier videos
- [ ] Content safety filters
- [ ] Frontend: credits display, transaction history

### Phase 8: Content Quality Safeguards
- [ ] Human-in-the-loop script preview before generation
- [ ] Hook strength scoring (LLM rates first 5 sec, 1–10)
- [ ] Retention predictor (estimated watch time %)
- [ ] Script editing UI

### Phase 9: Premium Video Generation
- [ ] Hybrid pipeline: stock clips + AI overlay/animation
- [ ] Premium tier: full text-to-video (Sora 2 / Kling 2.6)
- [ ] Style packs (anime, cinematic, minimalist, horror glitch)
- [ ] Built-in royalty-free music library
- [ ] ElevenLabs / Cartesia TTS integration

### Phase 10: Analytics & Growth
- [ ] Pull views/likes/comments from platform APIs
- [ ] Series Health Dashboard (CTR, retention warnings)
- [ ] A/B test lite: 2 variants → user picks winner
- [ ] Niche Trend Scanner (weekly trending topics)
- [ ] Localization: one-click dub to 5 languages
- [ ] User analytics: "You saved X hours this month"

### Infrastructure Upgrades
- [ ] SQLite → PostgreSQL migration
- [ ] Local storage → Cloudflare R2 / S3
- [ ] SSE for live generation progress updates
- [ ] Structured logging with trace IDs per pipeline step
- [ ] Public status page (queue length, avg generation time)

---

## Phasing Timeline (Realistic)

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1–6 | ✅ Complete | Foundations, pipeline, scheduling, Celery |
| Phase 7 | ~2 weeks | Stripe, credits UI, plan enforcement |
| Phase 8 | ~2 weeks | Script preview, hook scoring, quality gates |
| Phase 9 | ~3–4 weeks | Premium providers, hybrid visuals, music library |
| Phase 10 | Ongoing | Analytics, A/B, trends, localization |

**Total to polished launch: ~8–10 weeks remaining**
