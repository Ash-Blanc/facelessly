# Niche/Style System, Scheduling & Upload Integration

**Date:** 2026-02-18  
**Status:** ✅ Implemented (upgraded with Celery + upload-post.com)

## Overview

Extended Facelessly with three major capabilities:
1. **Niche & Style selection** — configurable presets that tailor the entire AI pipeline
2. **Daily auto-posting scheduler** — Celery + Redis background tasks replacing in-process workflow loop
3. **Multi-platform uploads** — unified via upload-post.com API (YouTube, TikTok, Instagram)

## Components

### 1. Config System (`config.py`)

6 niche presets and 5 style presets, each containing:
- Agent-specific instruction overrides (trend keywords, script tone, visual style)
- Voice preference per style (e.g., `echo` for cinematic, `nova` for bright)
- Video/image prompt suffixes for consistent aesthetics

| Niche | Focus | Example Keywords |
|-------|-------|------------------|
| luxury | Dark psychology, wealth visualization | luxury watches, sigma mindset |
| space | Astronomy, cosmic facts | space facts, universe mysteries |
| reddit | Community stories, AITA | Reddit stories, confession |
| finance | Growth mindset, money | crypto, investing, passive income |
| top10 | Listicle curiosity | most expensive, rarest, biggest |
| horror | Creepy, unsettling | true scary stories, urban legends |

| Style | Look | Voice |
|-------|------|-------|
| cinematic_dark | Dark moody, dramatic lighting | echo |
| bright_energetic | Vibrant, upbeat, fast cuts | nova |
| minimal_clean | Whitespace, simple graphics | alloy |
| retro_vintage | VHS grain, old film look | fable |
| neon_futuristic | Cyberpunk, glowing neon | shimmer |

### 2. Agent Factory (`agents.py`)

`create_faceless_team(niche_id, style_id)` dynamically configures all 5 agents with:
- Niche-specific trend research focus areas
- Style-matching visual and audio generation prompts
- Graceful fallback when API keys aren't set

### 3. Scheduling System (Celery + Redis)

- **Upgraded** from in-process `DailyVideoWorkflow` loop to Celery task queue
- `worker.py` — Celery app config with Redis broker/backend
- `tasks.py` — `check_pipelines_task` (Beat scheduled every 5 min), `generate_video_task`, `process_posts_task`
- Credit check and deduction integrated into generation task

### 4. Posting Module (`posting.py`)

| Platform | Status | Method |
|----------|--------|--------|
| YouTube | ✅ Functional | via upload-post.com API |
| TikTok | ✅ Functional | via upload-post.com API |
| Instagram | ✅ Functional | via upload-post.com API |

> **Note:** Replaced per-platform adapters with unified upload-post.com integration.

### 5. Frontend Pages

| Page | Route | Purpose |
|------|-------|---------|
| Landing | `/` | Hero + CTA → `/generate` |
| Generate Wizard | `/generate` | 4-step flow: niche → style → connect → generate |
| Calendar | `/calendar` | Content calendar with status chips |
| Dashboard | `/dashboard` | Kanban project board |
| Connections | `/connect` | Platform management + active schedule |
| Chat | `/chat` | Direct AI agent interaction |

## Files Created/Modified

| File | Status |
|------|--------|
| `BE/src/faceless/config.py` | ✅ NEW |
| `BE/src/faceless/agents.py` | ✅ Updated (factory functions) |
| `BE/src/faceless/database.py` | ✅ Updated (credits, transactions, 10 tables) |
| `BE/src/faceless/main.py` | ✅ Updated (Celery integration + credits endpoint) |
| `BE/src/faceless/worker.py` | ✅ NEW (Celery app config) |
| `BE/src/faceless/tasks.py` | ✅ NEW (Celery tasks with credit logic) |
| `BE/src/faceless/posting.py` | ✅ Updated (upload-post.com) |
| `BE/src/faceless/workflow.py` | ✅ Updated (scheduling helpers) |
| `BE/src/faceless/projects.py` | ✅ Updated |
| `BE/src/faceless/auth.py` | ✅ Updated |
| `BE/docker-compose.yml` | ✅ NEW (Redis) |
| `FE/src/app/page.tsx` | ✅ Updated |
| `FE/src/app/generate/page.tsx` | ✅ NEW |
| `FE/src/app/connect/page.tsx` | ✅ NEW |
| `FE/src/app/calendar/page.tsx` | ✅ NEW |
| `FE/src/app/chat/page.tsx` | ✅ Fixed |
| `FE/src/api/routes.ts` | ✅ Updated |
| `FE/src/store.ts` | ✅ Updated |

## Remaining Work

- [ ] Stripe billing integration
- [ ] Credit top-up UI and monthly refresh
- [ ] Script preview before generation (quality gate)
- [ ] Kanban drag-drop in dashboard
- [ ] Asset preview/editing panels
- [ ] Premium video generation providers
