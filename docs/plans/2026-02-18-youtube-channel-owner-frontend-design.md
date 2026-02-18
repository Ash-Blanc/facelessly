# YouTube Channel Owner Frontend Design

**Date:** 2026-02-18
**Status:** Approved

## Overview

Build a full-featured frontend for YouTube channel owners to manage faceless video production. Features YouTube OAuth integration, Kanban-style project management, step-by-step workflow with full control, and asset preview/editing with export options.

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Pages:                                                          │
│  ├── /auth/login          → YouTube OAuth flow                  │
│  ├── /auth/callback       → OAuth callback handler              │
│  ├── /dashboard           → Kanban board (main app)             │
│  └── /project/[id]        → Project detail/asset preview        │
│                                                                  │
│  Components:                                                     │
│  ├── KanbanBoard          → Columns + drag-drop cards           │
│  ├── ProjectCard          → Video project with asset previews   │
│  ├── AssetPreview         → Slide-out panel for media           │
│  ├── ScriptEditor         → Rich text editor for scripts        │
│  └── ExportPanel          → Download + export to editor options │
│                                                                  │
│  State:                                                          │
│  ├── Zustand store        → Projects, user, YouTube data        │
│  └── React Query          → API caching, optimistic updates     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (AgentOS + API)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Existing:                                                       │
│  ├── /teams/{id}/runs     → Run video generation pipeline       │
│  └── AgentOS endpoints    → Teams, agents, sessions             │
│                                                                  │
│  New API Routes:                                                 │
│  ├── POST /auth/youtube   → Initiate YouTube OAuth              │
│  ├── GET /auth/callback   → Handle OAuth callback               │
│  ├── GET /users/me        → Current user + channel data         │
│  ├── GET /projects        → List user's projects                │
│  ├── POST /projects       → Create new project                  │
│  ├── PATCH /projects/{id} → Update project status/position      │
│  ├── GET /projects/{id}   → Get project with all assets         │
│  └── DELETE /projects/{id}→ Delete project                      │
│                                                                  │
│  Database (SQLite):                                              │
│  ├── users                → YouTube channel data, tokens        │
│  ├── projects             → Kanban cards, status, position      │
│  └── assets               → Videos, audio, thumbnails, scripts  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Additions

| Layer | New Dependencies |
|-------|------------------|
| Frontend | `@dnd-kit/core` (drag-drop), `@tanstack/react-query`, `next-auth` or custom OAuth |
| Backend | `sqlite3` or `aiosqlite`, YouTube Data API client |

## Kanban Board & Project Workflow

### Kanban Columns

| Column | Status | What Happens | User Actions |
|--------|--------|--------------|--------------|
| **Backlog** | `backlog` | User creates empty project or enters topic idea | Create, delete, edit title |
| **Trends** | `trends` | ViralTrendScout runs, returns 3 trend ideas | Select one trend, regenerate, edit |
| **Scripting** | `scripting` | HookScriptWriter generates script | Edit script, regenerate, approve |
| **Media Gen** | `media_gen` | Video + Audio + Thumbnail generate in parallel | View progress, cancel, retry individual |
| **Review** | `review` | All assets ready for final approval | Preview all, edit, regenerate, approve |
| **Ready** | `ready` | Marked complete, ready for export | Download, export to editor, archive |

### Drag-and-Drop Rules

- **Forward moves**: Always allowed (Backlog → Trends → Scripting → Media Gen → Review → Ready)
- **Backward moves**: Allowed to any previous column (user can go back to fix things)
- **Auto-advance**: Option to auto-advance when step completes, or manual advance only

### Project Card Component

Each card shows:
- Title
- Status with progress indicator
- Created timestamp
- Asset quick previews (Script/Video/Audio/Thumb icons)
- Action buttons (Continue, Delete)

## Asset Preview & Editor

### Slide-Out Asset Panel

When user clicks a project card or specific asset, a slide-out panel appears with:
- Tabs for each asset type (Script, Video, Audio, Thumbnail)
- Large preview area
- Action buttons (Regenerate, Edit, Download, Export)

### Asset Types & Capabilities

| Asset | Preview | Edit Capability | Export Options |
|-------|---------|-----------------|----------------|
| **Script** | Markdown rendered | Full text editor, word count, hook highlight | Copy text, Download .md |
| **Video** | Video player with controls | None (regenerate only) | Download MP4, Export to CapCut |
| **Audio** | Audio player with waveform | None (regenerate only) | Download MP3, Export timing data |
| **Thumbnail** | Image preview | Prompt adjustment + regenerate | Download PNG, Export to Canva |

### Regeneration Flow

When user clicks "Regenerate":
1. **Script**: Opens prompt modal → user can modify instructions → re-runs HookScriptWriter agent
2. **Video**: Opens prompt modal → adjust visual style → re-runs VideoGenAgent
3. **Audio**: Voice selector dropdown → re-runs VoiceoverAgent
4. **Thumbnail**: Style selector → re-runs ThumbnailAgent

### Export Integration

- **CapCut**: Generates a project file with video + audio + timing markers
- **Canva**: Opens Canva with thumbnail as template (deep link)
- **Download All**: ZIP bundle with all assets + metadata JSON

## YouTube OAuth & Channel Integration

### OAuth Flow

1. Landing Page shows "Connect YouTube" and "Continue as Guest" options
2. YouTube OAuth redirects to consent screen (read-only scope, no upload)
3. Callback exchanges code for tokens, fetches channel data
4. User created/updated in database, redirected to dashboard

### Channel Data Fetched

| Data | Use Case |
|------|----------|
| Channel name | Personalized greeting, project defaults |
| Profile picture | Avatar in UI |
| Channel categories | Suggest niches for trend research |
| Recent video titles | Match content style, avoid duplicates |
| Default language | Script language preference |
| Subscriber count | Tailor content complexity |

### Guest Mode

Users who skip YouTube connection:
- Can still use full pipeline
- No brand personalization
- Projects stored locally (localStorage)
- Prompt to connect YouTube for cloud sync

## Database Schema (SQLite)

```sql
-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    youtube_channel_id TEXT UNIQUE,
    channel_name TEXT,
    channel_picture TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects table (Kanban cards)
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'backlog',
    position INTEGER,
    selected_trend_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trends table
CREATE TABLE trends (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    why_viral TEXT,
    competitive_analysis TEXT,
    sources TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assets table
CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    url TEXT,
    prompt TEXT,
    metadata TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/youtube` | Redirect to YouTube OAuth |
| GET | `/auth/callback` | Handle OAuth callback, return JWT |
| POST | `/auth/logout` | Clear session |
| GET | `/auth/me` | Current user + channel data |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List all projects for user |
| POST | `/projects` | Create new project |
| GET | `/projects/{id}` | Get project with all assets |
| PATCH | `/projects/{id}` | Update status, position, title |
| DELETE | `/projects/{id}` | Delete project + assets |

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/{id}/trends` | Run trend research |
| POST | `/projects/{id}/script` | Generate/regenerate script |
| POST | `/projects/{id}/media` | Generate video/audio/thumbnail |
| PATCH | `/assets/{id}` | Update asset (prompt, regenerate) |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/{id}/export` | Download all assets as ZIP |
| GET | `/projects/{id}/export/capcut` | Generate CapCut project file |
| GET | `/projects/{id}/export/canva` | Generate Canva deep link |

## Files to Create/Modify

### Frontend (FE/)

| File | Changes |
|------|---------|
| `src/app/page.tsx` | New landing page with YouTube connect |
| `src/app/auth/login/page.tsx` | OAuth login page |
| `src/app/auth/callback/page.tsx` | OAuth callback handler |
| `src/app/dashboard/page.tsx` | Kanban board main view |
| `src/app/project/[id]/page.tsx` | Project detail view |
| `src/components/KanbanBoard.tsx` | Drag-drop kanban component |
| `src/components/ProjectCard.tsx` | Individual project card |
| `src/components/AssetPreview.tsx` | Slide-out asset panel |
| `src/components/ScriptEditor.tsx` | Script editing component |
| `src/components/ExportPanel.tsx` | Export options component |
| `src/lib/api.ts` | API client functions |
| `src/store.ts` | Extend with user/projects state |

### Backend (BE/)

| File | Changes |
|------|---------|
| `src/faceless/main.py` | Add new API routes |
| `src/faceless/database.py` | SQLite setup and models |
| `src/faceless/auth.py` | YouTube OAuth handling |
| `src/faceless/projects.py` | Project CRUD operations |
| `src/faceless/assets.py` | Asset generation/storage |

## Success Criteria

1. User can connect YouTube account via OAuth
2. Kanban board displays projects with drag-drop
3. Step-by-step workflow: trends → script → media → review → ready
4. All assets previewable in slide-out panel
5. Scripts editable with full text control
6. Individual assets can be regenerated
7. Export to CapCut/Canva/download ZIP works
8. Guest mode works without YouTube connection
