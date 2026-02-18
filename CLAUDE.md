# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FacelessReels** — an autopilot system for generating and auto-posting viral faceless short-form videos (YouTube Shorts, Reels, TikTok). Users pick a niche, choose a style, pick a content template, connect their channels, and the platform auto-generates & auto-posts videos daily via pipelines.

- **FE/**: Next.js frontend — generation wizard, calendar, chat, dashboard, platform connections
- **BE/**: Python backend — Agno (AgentOS) agent pipeline, niche/style config, templates, pipelines, posting, scheduling

## Development Commands

### Frontend (FE/)

```bash
cd FE
bun install          # Install dependencies
bun dev              # Start dev server (http://localhost:3000)
bun build            # Production build
bun lint             # ESLint check
bun lint:fix         # Auto-fix lint issues
bun format           # Prettier check
bun format:fix       # Auto-format code
bun typecheck        # TypeScript check
bun validate         # Run lint + format + typecheck
```

### Backend (BE/)

```bash
cd BE
uv sync               # Install dependencies
docker-compose up -d redis  # Start Redis
uv run src/faceless/main.py   # Start API server (http://localhost:8000)
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
│   ├── connect/        # Platform connection management (YT, TT, IG)
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
├── main.py         # FastAPI app, all routes, AgentOS integration, workflow lifecycle
├── agents.py       # 5-agent pipeline with niche/style factory
├── config.py       # Niche presets (6) and style presets (5)
├── templates.py    # Content templates (6 built-in formats)
├── tools.py        # PollinationsTools for media generation
├── posting.py      # Multi-platform PostService with retry logic
├── auth.py         # YouTube OAuth (TikTok/Instagram scaffolded)
├── database.py     # SQLite: users, connected_accounts, projects, pipelines, post_jobs, content_jobs
├── projects.py     # Project/asset CRUD operations
├── upload.py       # Direct upload functions (legacy, see posting.py)
└── workflow.py     # Daily auto-generation background scheduler + rolling schedule
```

#### Agent Pipeline (agents.py)

`create_faceless_team(niche_id, style_id)` factory creates a configured 5-agent team:

1. **ViralTrendScout**: Finds viral content ideas using ParallelTools + YouTubeTools
2. **HookScriptWriter**: Converts ideas into 45-90s scripts (mistral-large)
3. **VideoGenAgent**: Generates faceless video clips via Pollinations.ai
4. **VoiceoverAgent**: Generates TTS audio via Pollinations.ai
5. **ThumbnailAgent**: Generates thumbnails via Pollinations.ai

#### Content Templates (templates.py)

6 built-in formats: `top5_facts`, `myth_vs_fact`, `tips_for`, `daily_quote`, `story_time`, `did_you_know` — each with structured sections, durations, and example scripts. Templates are tagged to niches.

#### Posting Service (posting.py)

`PostService` manages multi-platform posting:
- YouTube: functional via Data API v3 (downloads video → uploads)
- TikTok: scaffolded via Content Posting API
- Instagram: scaffolded via Graph API
- Retry logic with exponential backoff (3 retries)

#### Pipelines (via main.py + workflow.py)

A Pipeline = niche + style + template + platforms + frequency + timezone + posting times. The `DailyVideoWorkflow` background loop processes due pipelines, runs the agent team, and queues post jobs.

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

**Post Jobs:**
- `POST /posts/queue` — Queue video for posting
- `GET /posts/{user_id}` — List post history

**Calendar:** `GET /calendar/{user_id}?days=30` — Posts + content jobs grouped by date

**Connected Accounts:**
- `GET /accounts/{user_id}` — List connected platforms
- `DELETE /accounts/{user_id}/{platform}` — Disconnect platform

**Scheduling (legacy):** `POST /schedule`, `GET /schedule/{user_id}`, `DELETE /schedule/{user_id}`

**Projects:** CRUD at `/projects`, `/projects/{id}/trends`, `/projects/{id}/assets`

**Auth:** `GET /auth/youtube`, `GET /auth/callback`

### Environment Variables

**Backend (BE/.env):**
- `MISTRAL_API_KEY` — Required for Mistral AI models
- `PARALLEL_API_KEY` — Required for ParallelTools trend research
- `POLLINATIONS_API_KEY` — Optional, for enhanced rate limits
- `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REDIRECT_URI` — YouTube OAuth
- `PORT` — Server port (default: 8000)

**Frontend (FE/.env.local):**
- `NEXT_PUBLIC_OS_URL` — Backend URL (default: http://localhost:8000)

## Tech Stack

**Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Framer Motion, nuqs
**Backend:** Python 3.13, Agno/AgentOS, FastAPI, uvicorn, Mistral AI, Pollinations.ai, ParallelTools, YouTubeTools, aiosqlite, httpx
**Package Managers:** bun (FE), uv (BE)

## User Flow

1. **Landing** (`/`) → "Get Started"
2. **Generate wizard** (`/generate`) → Niche → Style → Connect → Generate
3. **Calendar** (`/calendar`) → View scheduled/posted content by date
4. **Chat** (`/chat`) → Direct AI agent interaction
5. **Dashboard** (`/dashboard`) → Kanban project management
6. **Connections** (`/connect`) → Platform management & schedule status
