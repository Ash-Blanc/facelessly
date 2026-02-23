# Facelessly

> AI-powered faceless video generation and auto-posting SaaS

Facelessly is a production-grade platform for creating and scheduling viral faceless short-form videos across YouTube, TikTok, and Instagram. Users pick a niche, choose voice and visual style, connect their social accounts, and the system auto-generates and schedules videos using a multi-agent AI pipeline.

## ✨ Key Features

- 🎬 **Multi-step creation wizard** — Select niche, style, voice, and start generating
- 🤖 **5-agent AI pipeline** — Trend research → Script writing → Video generation → Voiceover → Thumbnails
- 📅 **Content calendar** — Visualize scheduled and posted content
- 🔗 **Multi-platform posting** — YouTube, TikTok, Instagram via upload-post.com
- ⏱️ **Automated scheduling** — Celery + Redis background task queue
- 💳 **Credit system** — Usage-based credits with tier management
- 🎨 **6 niches, 5 styles** — Fully configurable AI pipeline per combination

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│            Frontend (Next.js 15 + React 18)         │
│      Dashboard · Wizard · Calendar · Chat           │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│              Backend (FastAPI + AgentOS)             │
│       Routes · Auth · Credits · Pipelines           │
└──────┬───────────────┬──────────────────────────────┘
       │               │
┌──────▼──────┐ ┌──────▼──────┐
│   Celery    │ │   SQLite    │
│  + Redis    │ │  (10 tables)│
│  Workers    │ └─────────────┘
└──────┬──────┘
       │
┌──────▼──────────────────────┐
│      AI Agent Pipeline      │
│  Mistral + Pollinations.ai  │
│  (5 agents, collaborative)  │
└──────┬──────────────────────┘
       │
┌──────▼──────────────────────┐
│      upload-post.com        │
│  YouTube · TikTok · IG      │
└─────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18, Python 3.13+, Docker (for Redis)

### Backend
```bash
cd BE
uv sync
docker-compose up -d redis
uv run src/faceless/main.py                                    # API on :8000
uv run celery -A faceless.worker worker --loglevel=info --beat # Workers
```

### Frontend
```bash
cd FE
npm install
npm run dev    # http://localhost:3000
```

See [BE/README.md](BE/README.md) and [FE/README.md](FE/README.md) for detailed setup.

## 📁 Project Structure

```
facelessly/
├── BE/                    # Python backend
│   └── src/faceless/      # FastAPI app, agents, tasks, posting
├── FE/                    # Next.js frontend
│   └── src/app/           # Pages: dashboard, generate, calendar, chat, connect
├── docs/plans/            # Implementation plans and design docs
├── docker-compose.yml     # Redis service
└── CLAUDE.md              # Developer guide
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Master Plan](docs/plans/2026-02-18-facelessreels-master-plan.md) | Full product roadmap and architecture |
| [CLAUDE.md](CLAUDE.md) | Developer guide for AI assistants |
| [BE README](BE/README.md) | Backend setup, endpoints, modules |
| [FE README](FE/README.md) | Frontend setup, pages, components |

## License

MIT
