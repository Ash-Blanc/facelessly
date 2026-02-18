# Niche/Style System, Scheduling & Upload Integration

**Date:** 2026-02-18
**Status:** ✅ Implemented

## Overview

Extended the Faceless Video Factory with three major capabilities:
1. **Niche & Style selection** — configurable presets that tailor the entire AI pipeline
2. **Daily auto-posting scheduler** — background workflow that generates and posts videos on a schedule
3. **Multi-platform uploads** — YouTube upload functional, TikTok/Instagram scaffolded

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

### 3. Scheduling System (`workflow.py` + `database.py`)

- `DailyVideoWorkflow` runs as a background task
- Checks for due schedules every 5 minutes
- Runs the AI pipeline and creates project entries
- Updates `last_run_at` / `next_run_at` timestamps

### 4. Upload Module (`upload.py`)

| Platform | Status | Method |
|----------|--------|--------|
| YouTube | ✅ Functional | YouTube Data API v3 (`videos.insert`) |
| TikTok | 🔲 Scaffolded | Awaiting API key integration |
| Instagram | 🔲 Scaffolded | Awaiting API key integration |

### 5. Frontend Pages

| Page | Route | Purpose |
|------|-------|---------|
| Landing | `/` | Hero + CTA → `/generate` |
| Generate Wizard | `/generate` | 4-step flow: niche → style → connect → generate |
| Connections | `/connect` | Platform management + active schedule |
| Chat | `/chat` | Direct AI agent interaction |

## Files Created/Modified

| File | Status |
|------|--------|
| `BE/src/faceless/config.py` | ✅ NEW |
| `BE/src/faceless/agents.py` | ✅ Updated (factory functions) |
| `BE/src/faceless/database.py` | ✅ Updated (schedules table) |
| `BE/src/faceless/main.py` | ✅ Updated (6 new endpoints) |
| `BE/src/faceless/upload.py` | ✅ NEW |
| `BE/src/faceless/workflow.py` | ✅ NEW |
| `BE/src/faceless/projects.py` | ✅ Updated |
| `BE/src/faceless/auth.py` | ✅ Updated |
| `FE/src/app/page.tsx` | ✅ Updated |
| `FE/src/app/generate/page.tsx` | ✅ NEW |
| `FE/src/app/connect/page.tsx` | ✅ NEW |
| `FE/src/app/chat/page.tsx` | ✅ Fixed |
| `FE/src/api/routes.ts` | ✅ Updated |
| `FE/src/store.ts` | ✅ Updated |

## Remaining Work

- [ ] TikTok Content Posting API integration
- [ ] Instagram Graph API integration
- [ ] Video download from Pollinations before upload
- [ ] End-to-end test with all API keys configured
- [ ] Kanban drag-drop in dashboard
- [ ] Asset preview/editing panels
