# YouTube Channel Owner Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-featured frontend for YouTube channel owners with Kanban project management, step-by-step workflow, and asset preview/editing with export options.

**Architecture:** Next.js frontend with Zustand state, drag-drop Kanban board, slide-out asset panels. Backend extends AgentOS with SQLite database for projects/assets, YouTube OAuth for channel integration.

**Tech Stack:** Next.js 15, React 18, TypeScript, Zustand, @dnd-kit/core, Tailwind CSS, shadcn/ui. Backend: FastAPI, SQLite (aiosqlite), YouTube Data API.

---

## Task 1: Backend - Database Setup & Models

**Files:**
- Create: `BE/src/faceless/database.py`

**Step 1: Create database.py with SQLite setup**

Create `BE/src/faceless/database.py`:

```python
"""Database setup and models for Faceless Video Factory."""

import sqlite3
from contextlib import asynccontextmanager
from typing import Any

import aiosqlite

DATABASE_PATH = "faceless.db"


async def init_db():
    """Initialize database tables."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                youtube_channel_id TEXT UNIQUE,
                channel_name TEXT,
                channel_picture TEXT,
                access_token TEXT,
                refresh_token TEXT,
                token_expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                title TEXT NOT NULL,
                status TEXT DEFAULT 'backlog',
                position INTEGER,
                selected_trend_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS trends (
                id TEXT PRIMARY KEY,
                project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                description TEXT,
                why_viral TEXT,
                competitive_analysis TEXT,
                sources TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS assets (
                id TEXT PRIMARY KEY,
                project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                url TEXT,
                prompt TEXT,
                metadata TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.commit()


@asynccontextmanager
async def get_db():
    """Get database connection context manager."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = sqlite3.Row
        yield db
        await db.commit()
```

**Step 2: Verify syntax**

Run: `cd BE && uv run python -c "from faceless.database import init_db; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
cd BE && git add src/faceless/database.py && git commit -m "feat: add database setup and models"
```

---

## Task 2: Backend - Auth Routes (YouTube OAuth)

**Files:**
- Create: `BE/src/faceless/auth.py`

**Step 1: Create auth.py with YouTube OAuth**

Create `BE/src/faceless/auth.py`:

```python
"""YouTube OAuth authentication handlers."""

import os
import uuid
from datetime import datetime, timedelta
from typing import Any

import httpx

from .database import get_db

YOUTUBE_CLIENT_ID = os.getenv("YOUTUBE_CLIENT_ID")
YOUTUBE_CLIENT_SECRET = os.getenv("YOUTUBE_CLIENT_SECRET")
YOUTUBE_REDIRECT_URI = os.getenv("YOUTUBE_REDIRECT_URI", "http://localhost:8000/auth/callback")

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


def get_authorization_url(state: str) -> str:
    """Generate YouTube OAuth authorization URL."""
    params = {
        "client_id": YOUTUBE_CLIENT_ID,
        "redirect_uri": YOUTUBE_REDIRECT_URI,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/youtube.readonly",
        "access_type": "offline",
        "state": state,
    }
    return f"{AUTH_URL}?{'&'.join(f'{k}={v}' for k, v in params.items())}"


async def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    """Exchange authorization code for access/refresh tokens."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            TOKEN_URL,
            data={
                "client_id": YOUTUBE_CLIENT_ID,
                "client_secret": YOUTUBE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": YOUTUBE_REDIRECT_URI,
            },
        )
        response.raise_for_status()
        return response.json()


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    """Refresh expired access token."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            TOKEN_URL,
            data={
                "client_id": YOUTUBE_CLIENT_ID,
                "client_secret": YOUTUBE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        return response.json()


async def get_channel_data(access_token: str) -> dict[str, Any]:
    """Fetch YouTube channel data."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{YOUTUBE_API_BASE}/channels",
            params={"part": "snippet,statistics", "mine": "true"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        data = response.json()
        if data.get("items"):
            return data["items"][0]
        return None


async def save_user(user_data: dict[str, Any]) -> str:
    """Save or update user in database."""
    user_id = user_data.get("id", str(uuid.uuid4()))

    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO users (id, youtube_channel_id, channel_name, channel_picture,
                            access_token, refresh_token, token_expires_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(youtube_channel_id) DO UPDATE SET
                channel_name = excluded.channel_name,
                channel_picture = excluded.channel_picture,
                access_token = excluded.access_token,
                refresh_token = excluded.refresh_token,
                token_expires_at = excluded.token_expires_at,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                user_id,
                user_data.get("youtube_channel_id"),
                user_data.get("channel_name"),
                user_data.get("channel_picture"),
                user_data.get("access_token"),
                user_data.get("refresh_token"),
                user_data.get("token_expires_at"),
            ),
        )
    return user_id


async def get_user_by_channel(channel_id: str) -> dict[str, Any] | None:
    """Get user by YouTube channel ID."""
    async with get_db() as db:
        async with db.execute(
            "SELECT * FROM users WHERE youtube_channel_id = ?", (channel_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None
```

**Step 2: Verify syntax**

Run: `cd BE && uv run python -c "from faceless.auth import get_authorization_url; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
cd BE && git add src/faceless/auth.py && git commit -m "feat: add YouTube OAuth handlers"
```

---

## Task 3: Backend - Project CRUD Routes

**Files:**
- Create: `BE/src/faceless/projects.py`

**Step 1: Create projects.py with CRUD operations**

Create `BE/src/faceless/projects.py`:

```python
"""Project and asset CRUD operations."""

import uuid
from typing import Any

from .database import get_db


async def create_project(user_id: str, title: str) -> dict[str, Any]:
    """Create a new project in backlog."""
    project_id = f"proj_{uuid.uuid4().hex[:12]}"

    async with get_db() as db:
        # Get max position in backlog
        async with db.execute(
            "SELECT COALESCE(MAX(position), -1) + 1 as pos FROM projects WHERE user_id = ? AND status = 'backlog'",
            (user_id,),
        ) as cursor:
            row = await cursor.fetchone()
            position = row["pos"] if row else 0

        await db.execute(
            """
            INSERT INTO projects (id, user_id, title, status, position)
            VALUES (?, ?, ?, 'backlog', ?)
            """,
            (project_id, user_id, title, position),
        )

    return {"id": project_id, "title": title, "status": "backlog", "position": position}


async def get_projects(user_id: str) -> list[dict[str, Any]]:
    """Get all projects for user, grouped by status."""
    async with get_db() as db:
        async with db.execute(
            "SELECT * FROM projects WHERE user_id = ? ORDER BY status, position",
            (user_id,),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def get_project(project_id: str, user_id: str) -> dict[str, Any] | None:
    """Get project with all related data."""
    async with get_db() as db:
        # Get project
        async with db.execute(
            "SELECT * FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user_id),
        ) as cursor:
            project = await cursor.fetchone()
            if not project:
                return None

            project_dict = dict(project)

        # Get trends
        async with db.execute(
            "SELECT * FROM trends WHERE project_id = ?",
            (project_id,),
        ) as cursor:
            trends = await cursor.fetchall()
            project_dict["trends"] = [dict(t) for t in trends]

        # Get assets
        async with db.execute(
            "SELECT * FROM assets WHERE project_id = ?",
            (project_id,),
        ) as cursor:
            assets = await cursor.fetchall()
            project_dict["assets"] = {a["type"]: dict(a) for a in assets}

        return project_dict


async def update_project(
    project_id: str, user_id: str, updates: dict[str, Any]
) -> dict[str, Any] | None:
    """Update project status/position/title."""
    allowed = {"title", "status", "position", "selected_trend_id"}
    updates = {k: v for k, v in updates.items() if k in allowed}

    if not updates:
        return await get_project(project_id, user_id)

    set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
    values = list(updates.values()) + [project_id, user_id]

    async with get_db() as db:
        await db.execute(
            f"UPDATE projects SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
            values,
        )

    return await get_project(project_id, user_id)


async def delete_project(project_id: str, user_id: str) -> bool:
    """Delete project and cascade delete assets/trends."""
    async with get_db() as db:
        await db.execute("DELETE FROM projects WHERE id = ? AND user_id = ?", (project_id, user_id))
    return True


async def add_trend(project_id: str, trend_data: dict[str, Any]) -> dict[str, Any]:
    """Add trend research result to project."""
    trend_id = f"trend_{uuid.uuid4().hex[:12]}"

    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO trends (id, project_id, title, description, why_viral, competitive_analysis, sources)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                trend_id,
                project_id,
                trend_data.get("title"),
                trend_data.get("description"),
                trend_data.get("why_viral"),
                trend_data.get("competitive_analysis"),
                trend_data.get("sources"),
            ),
        )

    return {"id": trend_id, **trend_data}


async def add_asset(project_id: str, asset_data: dict[str, Any]) -> dict[str, Any]:
    """Add asset to project."""
    asset_id = f"asset_{uuid.uuid4().hex[:12]}"

    async with get_db() as db:
        # Delete existing asset of same type
        await db.execute(
            "DELETE FROM assets WHERE project_id = ? AND type = ?",
            (project_id, asset_data.get("type")),
        )

        await db.execute(
            """
            INSERT INTO assets (id, project_id, type, url, prompt, metadata, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                asset_id,
                project_id,
                asset_data.get("type"),
                asset_data.get("url"),
                asset_data.get("prompt"),
                asset_data.get("metadata"),
                asset_data.get("status", "ready"),
            ),
        )

    return {"id": asset_id, **asset_data}
```

**Step 2: Verify syntax**

Run: `cd BE && uv run python -c "from faceless.projects import create_project; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
cd BE && git add src/faceless/projects.py && git commit -m "feat: add project CRUD operations"
```

---

## Task 4: Backend - API Routes Registration

**Files:**
- Modify: `BE/src/faceless/main.py`

**Step 1: Update main.py to include new routes**

Modify `BE/src/faceless/main.py` to add routes:

```python
"""Faceless Video Factory - Main entry point."""

import os
from dotenv import load_dotenv

from agno.os import AgentOS
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from .agents import faceless_team
from .auth import get_authorization_url, exchange_code_for_tokens, get_channel_data, save_user
from .database import init_db
from .projects import (
    create_project, get_projects, get_project,
    update_project, delete_project, add_trend, add_asset
)

load_dotenv()

# Create FastAPI app with custom title/description
app = FastAPI(
    title="Faceless Video Factory API",
    description="Autopilot viral faceless shorts generator",
    version="0.1.0",
)

# Initialize database on startup
@app.on_event("startup")
async def startup():
    await init_db()

# Auth routes
@app.get("/auth/youtube")
async def auth_youtube():
    """Redirect to YouTube OAuth."""
    state = os.urandom(16).hex()
    return RedirectResponse(get_authorization_url(state))

@app.get("/auth/callback")
async def auth_callback(code: str, state: str):
    """Handle OAuth callback."""
    tokens = await exchange_code_for_tokens(code)
    access_token = tokens["access_token"]

    channel_data = await get_channel_data(access_token)
    if channel_data:
        snippet = channel_data.get("snippet", {})
        user_data = {
            "youtube_channel_id": channel_data.get("id"),
            "channel_name": snippet.get("title"),
            "channel_picture": snippet.get("thumbnails", {}).get("default", {}).get("url"),
            "access_token": access_token,
            "refresh_token": tokens.get("refresh_token"),
            "token_expires_at": datetime.now() + timedelta(seconds=tokens.get("expires_in", 3600)),
        }
        user_id = await save_user(user_data)
        # Return user_id for now (in production, set session cookie)
        return {"user_id": user_id, "channel_name": user_data["channel_name"]}
    return {"error": "Failed to get channel data"}

# Project routes
@app.get("/projects")
async def list_projects(user_id: str):
    """List all projects for user."""
    return await get_projects(user_id)

@app.post("/projects")
async def create_new_project(user_id: str, title: str):
    """Create new project."""
    return await create_project(user_id, title)

@app.get("/projects/{project_id}")
async def get_project_details(project_id: str, user_id: str):
    """Get project with all assets."""
    return await get_project(project_id, user_id)

@app.patch("/projects/{project_id}")
async def update_project_details(project_id: str, user_id: str, updates: dict):
    """Update project."""
    return await update_project(project_id, user_id, updates)

@app.delete("/projects/{project_id}")
async def remove_project(project_id: str, user_id: str):
    """Delete project."""
    await delete_project(project_id, user_id)
    return {"deleted": True}

# Trend routes
@app.post("/projects/{project_id}/trends")
async def add_project_trend(project_id: str, trend_data: dict):
    """Add trend to project."""
    return await add_trend(project_id, trend_data)

# Asset routes
@app.post("/projects/{project_id}/assets")
async def add_project_asset(project_id: str, asset_data: dict):
    """Add asset to project."""
    return await add_asset(project_id, asset_data)

# Setup AgentOS with the team
agent_os = AgentOS(
    teams=[faceless_team],
    base_app=app,
)

# Get the combined app
app = agent_os.get_app()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "faceless.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
```

**Step 2: Verify syntax**

Run: `cd BE && uv run python -c "from faceless.main import app; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
cd BE && git add src/faceless/main.py && git commit -m "feat: add auth and project API routes"
```

---

## Task 5: Frontend - Install Dependencies

**Files:**
- Modify: `FE/package.json`

**Step 1: Add new dependencies**

Add to `FE/package.json`:
```json
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^10.0.0",
"@dnd-kit/utilities": "^3.2.2",
"@tanstack/react-query": "^5.62.0",
"uuid": "^11.0.5"
```

Run: `cd FE && pnpm install`

**Step 2: Commit**

```bash
cd FE && git add package.json pnpm-lock.yaml && git commit -m "chore: add dnd-kit and react-query dependencies"
```

---

## Task 6: Frontend - Extend Zustand Store

**Files:**
- Modify: `FE/src/store.ts`

**Step 1: Extend store with user and projects state**

Add to `FE/src/store.ts`:

```typescript
// Add to existing interfaces
interface User {
  id: string
  youtubeChannelId: string | null
  channelName: string | null
  channelPicture: string | null
  isConnected: boolean
  isGuest: boolean
}

interface Project {
  id: string
  title: string
  status: 'backlog' | 'trends' | 'scripting' | 'media_gen' | 'review' | 'ready'
  position: number
  selectedTrendId?: string
  trends?: Trend[]
  assets?: {
    script?: Asset
    video?: Asset
    audio?: Asset
    thumbnail?: Asset
  }
  createdAt?: number
}

interface Trend {
  id: string
  title: string
  description: string
  whyViral: string
  competitiveAnalysis: string
  sources: string[]
}

interface Asset {
  id: string
  type: 'script' | 'video' | 'audio' | 'thumbnail'
  url?: string
  prompt?: string
  metadata?: Record<string, unknown>
  status: 'pending' | 'generating' | 'ready' | 'failed'
}

// Extend store interface
interface StoreState {
  // ... existing fields
  user: User | null
  projects: Project[]
  selectedProject: Project | null

  // Actions
  setUser: (user: User | null) => void
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  setSelectedProject: (project: Project | null) => void
}
```

**Step 2: Commit**

```bash
cd FE && git add src/store.ts && git commit -m "feat: extend store with user and projects state"
```

---

## Task 7: Frontend - API Client

**Files:**
- Create: `FE/src/lib/api.ts`

**Step 1: Create API client**

Create `FE/src/lib/api.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = options

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }

  return response.json()
}

// Auth
export const authApi = {
  getYoutubeAuthUrl: () => api<{ url: string }>('/auth/youtube'),
  logout: () => api('/auth/logout', { method: 'POST' }),
}

// Projects
export const projectsApi = {
  list: (userId: string) => api<any[]>(`/projects?user_id=${userId}`),
  create: (userId: string, title: string) =>
    api<any>('/projects', { method: 'POST', body: { user_id: userId, title } }),
  get: (projectId: string, userId: string) =>
    api<any>(`/projects/${projectId}?user_id=${userId}`),
  update: (projectId: string, userId: string, updates: any) =>
    api<any>(`/projects/${projectId}?user_id=${userId}`, { method: 'PATCH', body: updates }),
  delete: (projectId: string, userId: string) =>
    api<any>(`/projects/${projectId}?user_id=${userId}`, { method: 'DELETE' }),
}
```

**Step 2: Commit**

```bash
cd FE && git add src/lib/api.ts && git commit -m "feat: add API client for backend"
```

---

## Task 8: Frontend - Kanban Board Component

**Files:**
- Create: `FE/src/components/KanbanBoard.tsx`

**Step 1: Create KanbanBoard component**

Create `FE/src/components/KanbanBoard.tsx`:

```tsx
'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { ProjectCard } from './ProjectCard'

const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'trends', title: 'Trends' },
  { id: 'scripting', title: 'Scripting' },
  { id: 'media_gen', title: 'Media Gen' },
  { id: 'review', title: 'Review' },
  { id: 'ready', title: 'Ready' },
] as const

interface Project {
  id: string
  title: string
  status: typeof COLUMNS[number]['id']
  position: number
}

interface KanbanBoardProps {
  projects: Project[]
  onProjectMove: (projectId: string, newStatus: string, newPosition: number) => void
  onProjectClick: (project: Project) => void
}

export function KanbanBoard({ projects, onProjectMove, onProjectClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const getProjectsByStatus = (status: string) =>
    projects.filter(p => p.status === status).sort((a, b) => a.position - b.position)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeProject = projects.find(p => p.id === active.id)
    if (!activeProject) return

    // Determine new status and position
    const overId = over.id as string

    // Check if dropped on a column
    const targetColumn = COLUMNS.find(c => c.id === overId)
    if (targetColumn) {
      const columnProjects = getProjectsByStatus(targetColumn.id)
      onProjectMove(activeProject.id, targetColumn.id, columnProjects.length)
      return
    }

    // Check if dropped on another project
    const overProject = projects.find(p => p.id === overId)
    if (overProject) {
      onProjectMove(activeProject.id, overProject.status, overProject.position)
    }
  }

  const activeProject = activeId ? projects.find(p => p.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {COLUMNS.map(column => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            projects={getProjectsByStatus(column.id)}
            onProjectClick={onProjectClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeProject ? (
          <ProjectCard project={activeProject} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
```

**Step 2: Create KanbanColumn component**

Create `FE/src/components/KanbanColumn.tsx`:

```tsx
'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ProjectCard } from './ProjectCard'

interface Project {
  id: string
  title: string
  status: string
  position: number
}

interface KanbanColumnProps {
  id: string
  title: string
  projects: Project[]
  onProjectClick: (project: Project) => void
}

export function KanbanColumn({ id, title, projects, onProjectClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-72 flex-col rounded-lg bg-gray-100 dark:bg-gray-800 ${
        isOver ? 'ring-2 ring-primary' : ''
      }`}
    >
      <div className="flex items-center justify-between border-b border-gray-200 p-3 dark:border-gray-700">
        <h3 className="font-semibold">{title}</h3>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-sm dark:bg-gray-700">
          {projects.length}
        </span>
      </div>

      <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onProjectClick(project)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
```

**Step 3: Commit**

```bash
cd FE && git add src/components/KanbanBoard.tsx src/components/KanbanColumn.tsx && git commit -m "feat: add KanbanBoard and KanbanColumn components"
```

---

## Task 9: Frontend - Project Card Component

**Files:**
- Create: `FE/src/components/ProjectCard.tsx`

**Step 1: Create ProjectCard component**

Create `FE/src/components/ProjectCard.tsx`:

```tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreVertical, Play, Trash2 } from 'lucide-react'

interface Project {
  id: string
  title: string
  status: string
  position: number
}

interface ProjectCardProps {
  project: Project
  onClick?: () => void
  isDragging?: boolean
}

export function ProjectCard({ project, onClick, isDragging }: ProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  }

  const statusColors = {
    backlog: 'bg-gray-400',
    trends: 'bg-blue-400',
    scripting: 'bg-purple-400',
    media_gen: 'bg-orange-400',
    review: 'bg-yellow-400',
    ready: 'bg-green-400',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-700 ${
        isDragging ? 'shadow-lg' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between">
        <h4 className="line-clamp-2 flex-1 text-sm font-medium">{project.title}</h4>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${statusColors[project.status as keyof typeof statusColors]}`} />
        <span className="text-xs text-gray-500">{project.status.replace('_', ' ')}</span>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClick?.()
          }}
          className="flex flex-1 items-center justify-center gap-1 rounded bg-primary px-2 py-1 text-xs text-white hover:bg-primary/90"
        >
          <Play className="h-3 w-3" />
          Continue
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            // Handle delete
          }}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
cd FE && git add src/components/ProjectCard.tsx && git commit -m "feat: add ProjectCard component"
```

---

## Task 10: Frontend - Asset Preview Panel

**Files:**
- Create: `FE/src/components/AssetPreview.tsx`

**Step 1: Create AssetPreview component**

Create `FE/src/components/AssetPreview.tsx`:

```tsx
'use client'

import { X, Download, RefreshCw, Edit, ExternalLink } from 'lucide-react'
import { useState } from 'react'

interface Asset {
  id: string
  type: 'script' | 'video' | 'audio' | 'thumbnail'
  url?: string
  content?: string
  prompt?: string
  status: 'pending' | 'generating' | 'ready' | 'failed'
}

interface Project {
  id: string
  title: string
  assets?: {
    script?: Asset
    video?: Asset
    audio?: Asset
    thumbnail?: Asset
  }
}

interface AssetPreviewProps {
  project: Project
  isOpen: boolean
  onClose: () => void
  onRegenerate: (type: string) => void
  onDownload: (type: string) => void
  onExport: (type: string, target: string) => void
}

type TabType = 'script' | 'video' | 'audio' | 'thumbnail'

export function AssetPreview({
  project,
  isOpen,
  onClose,
  onRegenerate,
  onDownload,
  onExport,
}: AssetPreviewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('script')

  if (!isOpen) return null

  const tabs: { id: TabType; label: string }[] = [
    { id: 'script', label: 'Script' },
    { id: 'video', label: 'Video' },
    { id: 'audio', label: 'Audio' },
    { id: 'thumbnail', label: 'Thumbnail' },
  ]

  const asset = project.assets?.[activeTab]

  const renderPreview = () => {
    if (!asset || asset.status === 'pending') {
      return <div className="flex h-64 items-center justify-center text-gray-400">No asset yet</div>
    }

    if (asset.status === 'generating') {
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="text-gray-500">Generating {activeTab}...</span>
        </div>
      )
    }

    switch (activeTab) {
      case 'script':
        return (
          <div className="prose dark:prose-invert max-h-96 overflow-y-auto rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <pre className="whitespace-pre-wrap text-sm">{asset.content || asset.prompt}</pre>
          </div>
        )
      case 'video':
        return asset.url ? (
          <video src={asset.url} controls className="max-h-64 w-full rounded-lg" />
        ) : null
      case 'audio':
        return asset.url ? (
          <audio src={asset.url} controls className="w-full" />
        ) : null
      case 'thumbnail':
        return asset.url ? (
          <img src={asset.url} alt="Thumbnail" className="max-h-64 rounded-lg" />
        ) : null
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l bg-white shadow-xl dark:bg-gray-900">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">{project.title}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto p-4">{renderPreview()}</div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 border-t p-4">
          <button
            onClick={() => onRegenerate(activeTab)}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </button>

          <button
            onClick={() => onDownload(activeTab)}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Download
          </button>

          {activeTab === 'video' && (
            <button
              onClick={() => onExport(activeTab, 'capcut')}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              Export to CapCut
            </button>
          )}

          {activeTab === 'thumbnail' && (
            <button
              onClick={() => onExport(activeTab, 'canva')}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              Export to Canva
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
cd FE && git add src/components/AssetPreview.tsx && git commit -m "feat: add AssetPreview slide-out panel"
```

---

## Task 11: Frontend - Dashboard Page

**Files:**
- Create: `FE/src/app/dashboard/page.tsx`

**Step 1: Create dashboard page**

Create `FE/src/app/dashboard/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { KanbanBoard } from '@/components/KanbanBoard'
import { AssetPreview } from '@/components/AssetPreview'

interface Project {
  id: string
  title: string
  status: 'backlog' | 'trends' | 'scripting' | 'media_gen' | 'review' | 'ready'
  position: number
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [userId] = useState('demo-user') // TODO: Get from auth

  // Load projects on mount
  useEffect(() => {
    // TODO: Load from API
    setProjects([
      { id: '1', title: 'Test Project', status: 'backlog', position: 0 },
    ])
  }, [])

  const handleCreateProject = () => {
    const title = prompt('Enter project title:')
    if (title) {
      const newProject: Project = {
        id: `proj_${Date.now()}`,
        title,
        status: 'backlog',
        position: projects.filter(p => p.status === 'backlog').length,
      }
      setProjects([...projects, newProject])
    }
  }

  const handleProjectMove = (projectId: string, newStatus: string, newPosition: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return { ...p, status: newStatus as Project['status'], position: newPosition }
      }
      return p
    }))
  }

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setIsPreviewOpen(true)
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-6 py-4 dark:bg-gray-900">
        <h1 className="text-2xl font-bold">Video Factory</h1>
        <button
          onClick={handleCreateProject}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
          New Project
        </button>
      </header>

      {/* Kanban Board */}
      <main className="flex-1 overflow-hidden">
        <KanbanBoard
          projects={projects}
          onProjectMove={handleProjectMove}
          onProjectClick={handleProjectClick}
        />
      </main>

      {/* Asset Preview Panel */}
      {selectedProject && (
        <AssetPreview
          project={selectedProject}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onRegenerate={(type) => console.log('Regenerate:', type)}
          onDownload={(type) => console.log('Download:', type)}
          onExport={(type, target) => console.log('Export:', type, target)}
        />
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
cd FE && git add src/app/dashboard/page.tsx && git commit -m "feat: add dashboard page with Kanban board"
```

---

## Task 12: Landing Page Update

**Files:**
- Modify: `FE/src/app/page.tsx`

**Step 1: Update landing page with YouTube connect**

Modify `FE/src/app/page.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { Youtube, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="max-w-lg text-center">
        {/* Logo/Title */}
        <div className="mb-8">
          <h1 className="mb-2 text-5xl font-bold text-white">
            Faceless Video Factory
          </h1>
          <p className="text-xl text-gray-400">
            Create viral faceless videos in minutes
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => router.push('/auth/youtube')}
            className="flex items-center justify-center gap-3 rounded-full bg-red-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-red-700 hover:shadow-lg"
          >
            <Youtube className="h-6 w-6" />
            Connect YouTube
            <ArrowRight className="h-5 w-5" />
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center gap-2 rounded-full border border-gray-600 px-8 py-3 text-lg font-medium text-gray-300 transition-all hover:border-gray-500 hover:bg-gray-800"
          >
            Continue as Guest
          </button>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-left">
          <div className="rounded-lg bg-white/5 p-4">
            <h3 className="mb-1 font-semibold text-white">AI Research</h3>
            <p className="text-sm text-gray-400">Find trending topics</p>
          </div>
          <div className="rounded-lg bg-white/5 p-4">
            <h3 className="mb-1 font-semibold text-white">Auto Generate</h3>
            <p className="text-sm text-gray-400">Script, video, audio</p>
          </div>
          <div className="rounded-lg bg-white/5 p-4">
            <h3 className="mb-1 font-semibold text-white">Export Ready</h3>
            <p className="text-sm text-gray-400">CapCut, Canva & more</p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
cd FE && git add src/app/page.tsx && git commit -m "feat: update landing page with YouTube connect"
```

---

## Task 13: Integration Test

**Step 1: Start backend**

Run: `cd BE && uv run src/faceless/main.py`
Expected: Server starts on port 8000

**Step 2: Start frontend**

Run: `cd FE && pnpm dev`
Expected: Dev server starts on port 3000

**Step 3: Verify pages load**

- http://localhost:3000 - Landing page with YouTube connect button
- http://localhost:3000/dashboard - Kanban board
- http://localhost:8000/docs - API docs

**Step 4: Commit**

```bash
git add -A && git commit -m "test: verify frontend and backend integration"
```

---

## Success Criteria

- [ ] Backend starts without errors on port 8000
- [ ] Frontend starts without errors on port 3000
- [ ] Landing page shows YouTube connect button
- [ ] Dashboard shows Kanban board with columns
- [ ] Projects can be created and moved between columns
- [ ] Asset preview panel opens on project click
- [ ] API endpoints return correct data
