# Faceless Video Factory — Backend

Agno/AgentOS-powered backend for autopilot faceless video generation and multi-platform posting.

## Quick Start

```bash
uv sync                          # Install dependencies
cp .env.example .env             # Fill in API keys
uv run src/faceless/main.py      # Start server (auto-starts daily workflow)
```

- **API Docs:** http://localhost:8000/docs
- **Frontend:** http://localhost:3000

## Architecture

### Agent Pipeline

A 5-agent collaborative team generates complete video packages:

| # | Agent | Model | Tools | Output |
|---|-------|-------|-------|--------|
| 1 | ViralTrendScout | mistral-small | ParallelTools, YouTubeTools | 3 viral ideas |
| 2 | HookScriptWriter | mistral-large | — (pure reasoning) | 45-90s script |
| 3 | VideoGenAgent | mistral-small | PollinationsTools (video) | Video clip URLs |
| 4 | VoiceoverAgent | mistral-small | PollinationsTools (audio) | TTS audio URL |
| 5 | ThumbnailAgent | mistral-small | PollinationsTools (image) | Thumbnail URLs |

### Niche/Style System

`create_faceless_team(niche_id, style_id)` tailors all agent instructions.

**Niches:** luxury, space, reddit, finance, top10, horror
**Styles:** cinematic_dark, bright_energetic, minimal_clean, retro_vintage, neon_futuristic

### Content Templates

6 built-in script formats: `top5_facts`, `myth_vs_fact`, `tips_for`, `daily_quote`, `story_time`, `did_you_know`

### Modules

| Module | Purpose |
|--------|---------|
| `main.py` | FastAPI app, all routes, AgentOS, workflow lifecycle |
| `agents.py` | Agent definitions + team factory |
| `config.py` | Niche & style presets |
| `templates.py` | Content templates with LLM prompt generation |
| `tools.py` | PollinationsTools (video/audio/image) |
| `posting.py` | Multi-platform PostService with retry logic |
| `auth.py` | YouTube OAuth |
| `database.py` | SQLite schema (8 tables) |
| `projects.py` | Project/asset CRUD |
| `upload.py` | Direct upload functions (legacy) |
| `workflow.py` | Pipeline-based daily scheduler |

## API Endpoints

### Config
- `GET /niches` — List niche presets
- `GET /styles` — List style presets
- `GET /templates?niche=...` — List content templates
- `GET /templates/{id}` — Template detail with example script

### Generation
- `POST /generate` — `{ niche, style, template?, user_id }`

### Pipelines
- `GET /pipelines/{user_id}` — List pipelines
- `POST /pipelines` — Create pipeline with full schedule config
- `PATCH /pipelines/{id}` — Update
- `DELETE /pipelines/{id}` — Delete with content jobs

### Posting
- `POST /posts/queue` — Queue video for posting
- `GET /posts/{user_id}` — Post history with statuses

### Calendar
- `GET /calendar/{user_id}?days=30` — Posts + content jobs by date

### Connected Accounts
- `GET /accounts/{user_id}` — List connected platforms
- `DELETE /accounts/{user_id}/{platform}` — Disconnect

### Projects
- CRUD: `GET/POST /projects`, `GET/PATCH/DELETE /projects/{id}`
- `POST /projects/{id}/trends`, `POST /projects/{id}/assets`

### Auth
- `GET /auth/youtube` → OAuth redirect
- `GET /auth/callback` → Token exchange + redirect to frontend

## Database Schema

8 tables: `users`, `connected_accounts`, `projects`, `trends`, `assets`, `pipelines`, `content_jobs`, `post_jobs`

## Environment Variables

```bash
# Required
MISTRAL_API_KEY=your_mistral_key
PARALLEL_API_KEY=your_parallel_key

# Optional
POLLINATIONS_API_KEY=optional_enhanced_rate_limits
PORT=8000

# YouTube OAuth
YOUTUBE_CLIENT_ID=your_google_client_id
YOUTUBE_CLIENT_SECRET=your_google_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:8000/auth/callback
```