# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Faceless Video Factory - an autopilot system for generating viral faceless short-form videos (YouTube Shorts, Reels, TikTok). The project consists of two separate applications:

- **FE/**: Next.js frontend chat interface for interacting with AI agents
- **BE/**: Python backend using Agno (AgentOS) framework for AI agent orchestration

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
uv run src/faceless/main.py   # Start server (http://localhost:8000)
```

Backend runs on port 8000 with FastAPI Swagger docs at `/docs`.

## Architecture

### Frontend Structure

```
FE/src/
├── api/          # API routes and os.ts for backend communication
├── app/          # Next.js app router (layout, page)
├── components/   # React components
│   ├── chat/     # ChatArea, Sidebar, Messages, Multimedia
│   └── ui/       # shadcn/ui components (button, dialog, etc.)
├── hooks/        # Custom hooks for streaming and chat actions
├── lib/          # Utilities
├── store.ts      # Zustand global state
└── types/os.ts   # TypeScript types matching AgentOS API
```

Key patterns:
- Zustand store (`store.ts`) manages endpoint, agents, teams, messages, sessions
- `useAIStreamHandler.tsx` handles Server-Sent Events streaming from AgentOS
- Path alias `@/*` maps to `./src/*`

### Backend Structure

```
BE/src/faceless/
├── main.py       # FastAPI app via AgentOS
├── agents.py     # Agent definitions (5-agent pipeline)
├── tools.py      # PollinationsTools for media generation
└── workflow.py   # (placeholder for workflows)
```

The backend uses Agno's AgentOS which auto-generates FastAPI endpoints. The `faceless_team` is a collaborative team with five agents in a pipeline:
1. **ViralTrendScout**: Finds viral content ideas using ParallelTools + YouTubeTools
2. **HookScriptWriter**: Converts ideas into 45-90 second video scripts (uses mistral-large)
3. **VideoGenAgent**: Generates faceless video clips via Pollinations.ai
4. **VoiceoverAgent**: Generates TTS audio via Pollinations.ai
5. **ThumbnailAgent**: Generates thumbnails via Pollinations.ai

### API Communication

Frontend connects to backend AgentOS API. Default endpoint: `http://localhost:8000` (FE defaults to `localhost:7777`, change in UI or via store). Key endpoints defined in `FE/src/api/routes.ts`:
- `GET /agents` - List available agents
- `GET /teams` - List available teams
- `POST /teams/{team_id}/runs` - Run a team with streaming
- `POST /agents/{agent_id}/runs` - Run an agent with streaming
- `GET /sessions` - List chat sessions
- `GET /health` - Health check

### Environment Variables

**Backend (BE/.env):**
- `MISTRAL_API_KEY` - Required for Mistral AI models
- `PARALLEL_API_KEY` - Required for ParallelTools trend research
- `POLLINATIONS_API_KEY` - Optional, for enhanced rate limits
- `PORT` - Server port (default: 8000)

**Frontend (FE/.env.local):**
- `NEXT_PUBLIC_OS_SECURITY_KEY` - Optional auth token for AgentOS

## Tech Stack

**Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Framer Motion, nuqs (URL state)

**Backend:** Python 3.13, Agno/AgentOS, FastAPI, uvicorn, Mistral AI models, Pollinations.ai (media), ParallelTools (research), YouTubeTools (analysis)

**Package Managers:** bun (FE), uv (BE)
