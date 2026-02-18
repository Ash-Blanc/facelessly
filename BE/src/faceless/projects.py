"""Project and asset CRUD operations."""

import uuid
from typing import Any

from faceless.database import get_db


async def create_project(
    user_id: str,
    title: str,
    niche_id: str | None = None,
    style_id: str | None = None,
) -> dict[str, Any]:
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
            INSERT INTO projects (id, user_id, title, niche, style, status, position)
            VALUES (?, ?, ?, ?, ?, 'backlog', ?)
            """,
            (project_id, user_id, title, niche_id, style_id, position),
        )

    return {
        "id": project_id,
        "title": title,
        "niche": niche_id,
        "style": style_id,
        "status": "backlog",
        "position": position,
    }


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
