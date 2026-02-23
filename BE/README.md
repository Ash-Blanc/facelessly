# Facelessly — Backend

AI-powered faceless video generation and auto-posting SaaS backend. Built with **FastAPI**, **Celery**, **Redis**, and an **Agno** multi-agent pipeline.

## Quick Start

```bash
# 1. Install dependencies
uv sync

# 2. Configure environment
cp .env.example .env    # Fill in API keys

# 3. Start Redis (requires Docker)
docker-compose up -d redis

# 4. Start API server
uv run src/faceless/main.py

# 5. Start Celery worker + scheduler (separate terminal)
uv run celery -A faceless.worker worker --loglevel=info --beat
```

- **API Docs:** http://localhost:8000/docs
- **Frontend:** http://localhost:3000

## Architecture

### AI Agent Pipeline

A 5-agent collaborative team generates complete video packages:

| # | Agent | Model | Tools | Output |
|---|-------|-------|-------|--------|
| 1 | ViralTrendScout | mistral-small | ParallelTools, YouTubeTools | 3 viral ideas |
| 2 | HookScriptWriter | mistral-large | — (pure reasoning) | 45-90s script |
| 3 | VideoGenAgent | mistral-small | PollinationsTools (video) | Video clip URLs |
| 4 | VoiceoverAgent | mistral-small | PollinationsTools (audio) | TTS audio URL |
| 5 | ThumbnailAgent | mistral-small | PollinationsTools (image) | Thumbnail URLs |

### Task Queue (Celery + Redis)

Background tasks handle heavy processing outside the API server:

| Task | Trigger | What It Does |
|------|---------|-------------|
| `check_pipelines_task` | Celery Beat (5 min) | Finds due pipelines, dispatches generation |
| `generate_video_task` | Pipeline check | Runs agent team, deducts credits, queues post |
| `process_posts_task` | Celery Beat (5 min) | Sends ready posts via upload-post.com |

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
| `posting.py` | upload-post.com integration with retry logic |
| `worker.py` | Celery application configuration |
| `tasks.py` | Celery task definitions (generation, posting, credits) |
| `auth.py` | YouTube OAuth |
| `database.py` | SQLite schema (10 tables including credits & transactions) |
| `projects.py` | Project/asset CRUD |
| `workflow.py` | Pipeline scheduling helpers |

## API Endpoints

### Config
- `GET /niches` — List niche presets
- `GET /styles` — List style presets
- `GET /templates?niche=...` — List content templates
- `GET /templates/{id}` — Template detail

### Generation
- `POST /generate` — `{ niche, style, template?, user_id }`

### Pipelines
- `GET /pipelines/{user_id}` — List pipelines
- `POST /pipelines` — Create pipeline with schedule config
- `PATCH /pipelines/{id}` — Update
- `DELETE /pipelines/{id}` — Delete

### Credits
- `GET /credits/{user_id}` — User credit balance and tier

### Posting
- `POST /posts/queue` — Queue video for posting
- `GET /posts/{user_id}` — Post history

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
- `GET /auth/callback` → Token exchange

## Database Schema

10 tables: `users` (with credits & tier), `connected_accounts`, `projects`, `trends`, `assets`, `pipelines`, `content_jobs`, `post_jobs`, `transactions`

## Environment Variables

```bash
# Required
MISTRAL_API_KEY=your_mistral_key
PARALLEL_API_KEY=your_parallel_key

# Celery / Redis
REDIS_URL=redis://localhost:6379/0

# Posting
UPLOAD_POST_API_KEY=your_upload_post_key

# Optional
POLLINATIONS_API_KEY=optional_enhanced_rate_limits
PORT=8000
ENABLE_BACKGROUND_WORKFLOW=false

# YouTube OAuth
YOUTUBE_CLIENT_ID=your_google_client_id
YOUTUBE_CLIENT_SECRET=your_google_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:8000/auth/callback
```

## License

MIT