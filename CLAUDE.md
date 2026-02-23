# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Facelessly** — a production SaaS for generating and auto-posting viral faceless short-form videos (YouTube Shorts, Reels, TikTok). Users pick a niche, choose voice/style, connect socials, and the platform auto-generates & auto-posts videos via Celery-powered pipelines.

- **FE/**: Next.js 15 frontend — generation wizard, calendar, chat, dashboard, platform connections
- **BE/**: Python backend — 5-agent AI pipeline, Celery task queue, credit system, upload-post.com integration

## Development Commands

### Frontend (FE/)

```bash
cd FE
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
npm run typecheck    # TypeScript check
```

### Backend (BE/)

```bash
cd BE
uv sync                         # Install dependencies
docker-compose up -d redis      # Start Redis
uv run src/faceless/main.py     # Start API server (http://localhost:8000)

# In a separate terminal:
uv run celery -A faceless.worker worker --loglevel=info --beat  # Start Worker + Beat
```

Backend runs on port 8000 with FastAPI Swagger docs at `/docs`.

## Architecture

### Frontend Structure

```
FE/src/
├── api/          # API routes (routes.ts): all backend endpoint URLs
├── app/          # Next.js app router pages
│   ├── page.tsx        # Landing page with CTA → /generate
│   ├── chat/           # AI agent chat interface
│   ├── generate/       # 4-step wizard: niche → style → connect → generate
│   ├── connect/        # Platform connection management
│   ├── calendar/       # Content calendar with post statuses
│   └── dashboard/      # Kanban project board
├── components/   # React components (chat/, ui/)
├── hooks/        # Custom hooks for streaming and chat actions
├── lib/          # Utilities
├── store.ts      # Zustand global state
└── types/os.ts   # TypeScript types matching AgentOS API
```

### Backend Structure

```
BE/src/faceless/
├── main.py         # FastAPI app, all routes, AgentOS integration
├── agents.py       # 5-agent pipeline with niche/style factory
├── config.py       # Niche presets (6) and style presets (5)
├── templates.py    # Content templates (6 built-in formats)
├── tools.py        # PollinationsTools for media generation
├── worker.py       # Celery application configuration (Redis broker)
├── tasks.py        # Celery tasks: generation, posting, credit deduction
├── posting.py      # upload-post.com integration with retry logic
├── auth.py         # YouTube OAuth
├── database.py     # SQLite: users, pipelines, transactions, etc. (10 tables)
├── projects.py     # Project/asset CRUD operations
├── upload.py       # Direct upload functions (legacy)
└── workflow.py     # Pipeline scheduling helpers (get_due_pipelines)
```

#### Agent Pipeline (agents.py)

`create_faceless_team(niche_id, style_id)` factory creates a configured 5-agent team:

1. **ViralTrendScout**: Finds viral content ideas using ParallelTools + YouTubeTools
2. **HookScriptWriter**: Converts ideas into 45-90s scripts (mistral-large)
3. **VideoGenAgent**: Generates faceless video clips via Pollinations.ai
4. **VoiceoverAgent**: Generates TTS audio via Pollinations.ai
5. **ThumbnailAgent**: Generates thumbnails via Pollinations.ai

#### Task Queue (worker.py + tasks.py)

Celery with Redis handles background processing:

- `check_pipelines_task`: Periodic task (every 5 min via Beat) that finds due pipelines and dispatches generation
- `generate_video_task`: Runs agent team, checks/deducts credits, creates post job on success
- `process_posts_task`: Sends pending posts via upload-post.com

#### Content Templates (templates.py)

6 built-in formats: `top5_facts`, `myth_vs_fact`, `tips_for`, `daily_quote`, `story_time`, `did_you_know` — each with structured sections, durations, and example scripts. Templates are tagged to niches.

#### Posting Service (posting.py)

`PostService` manages multi-platform posting via upload-post.com unified API:
- Platform auto-mapping (youtube, tiktok, instagram)
- Poll-based job status tracking
- Retry logic with exponential backoff (3 retries)

#### Credit System

- Users have `credits` column (deducted per generation) and `tier` (free/pro/scale)
- `transactions` table logs every credit debit
- `GET /credits/{user_id}` endpoint exposes balance

### API Endpoints

**AgentOS (auto-generated):**
- `GET /agents`, `GET /teams`, `POST /teams/{team_id}/runs`, `GET /sessions`, `GET /health`

**Niche & Style:** `GET /niches`, `GET /styles`

**Templates:** `GET /templates?niche=...`, `GET /templates/{id}`

**Generation:** `POST /generate` — `{ niche, style, template?, user_id, prompt? }`

**Pipelines:**
- `GET /pipelines/{user_id}` — List user's pipelines
- `POST /pipelines` — Create pipeline (niche + style + template + schedule)
- `PATCH /pipelines/{id}` — Update pipeline
- `DELETE /pipelines/{id}` — Delete pipeline

**Credits:** `GET /credits/{user_id}` — Credit balance and tier

**Post Jobs:**
- `POST /posts/queue` — Queue video for posting
- `GET /posts/{user_id}` — List post history

**Calendar:** `GET /calendar/{user_id}?days=30` — Posts + content jobs grouped by date

**Connected Accounts:**
- `GET /accounts/{user_id}` — List connected platforms
- `DELETE /accounts/{user_id}/{platform}` — Disconnect platform

**Projects:** CRUD at `/projects`, `/projects/{id}/trends`, `/projects/{id}/assets`

**Auth:** `GET /auth/youtube`, `GET /auth/callback`

### Environment Variables

**Backend (BE/.env):**
- `MISTRAL_API_KEY` — Required for Mistral AI models
- `PARALLEL_API_KEY` — Required for ParallelTools trend research
- `REDIS_URL` — Redis URL for Celery (default: `redis://localhost:6379/0`)
- `UPLOAD_POST_API_KEY` — Required for upload-post.com posting
- `POLLINATIONS_API_KEY` — Optional, for enhanced rate limits
- `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REDIRECT_URI` — YouTube OAuth
- `PORT` — Server port (default: 8000)
- `ENABLE_BACKGROUND_WORKFLOW` — Legacy in-process loop (default: false)

**Frontend (FE/.env.local):**
- `NEXT_PUBLIC_API_URL` — Backend URL (default: http://localhost:8000)

## Tech Stack

**Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Framer Motion, nuqs
**Backend:** Python 3.13, Agno/AgentOS, FastAPI, Celery, Redis, Mistral AI, Pollinations.ai, httpx, aiosqlite
**Package Managers:** npm (FE), uv (BE)

## User Flow

1. **Landing** (`/`) → "Get Started"
2. **Generate wizard** (`/generate`) → Niche → Style → Connect → Generate
3. **Calendar** (`/calendar`) → View scheduled/posted content by date
4. **Chat** (`/chat`) → Direct AI agent interaction
5. **Dashboard** (`/dashboard`) → Kanban project management
6. **Connections** (`/connect`) → Platform management & schedule status
