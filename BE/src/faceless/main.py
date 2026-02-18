"""Faceless Video Factory - Main entry point."""

import os
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables before any other imports
load_dotenv()

from agno.os import AgentOS
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from faceless.agents import faceless_team, create_faceless_team
from faceless.auth import get_authorization_url, exchange_code_for_tokens, get_channel_data, save_user
from faceless.config import list_niches, list_styles, get_niche, get_style
from faceless.database import init_db, get_db
from faceless.posting import create_post_job, get_post_jobs, post_service
from faceless.projects import (
    create_project, get_projects, get_project,
    update_project, delete_project, add_trend, add_asset
)
from faceless.templates import list_templates, get_template
from faceless.workflow import daily_workflow, generate_rolling_schedule

# Create FastAPI app with custom title/description
app = FastAPI(
    title="Faceless Video Factory API",
    description="Autopilot viral faceless shorts generator — niche + style + connect → daily autopost",
    version="0.2.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:7777", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Initialize database and start workflow on startup."""
    await init_db()
    
    # Start the daily workflow in the background ONLY if enabled
    # In production, we use Celery Beat instead.
    if os.getenv("ENABLE_BACKGROUND_WORKFLOW", "false").lower() == "true":
        logger.info("Starting in-process daily workflow (Legacy Mode)")
        await daily_workflow.start()


@app.on_event("shutdown")
async def shutdown():
    """Stop workflow on shutdown."""
    if os.getenv("ENABLE_BACKGROUND_WORKFLOW", "false").lower() == "true":
        await daily_workflow.stop()


# =========================================
# Auth routes
# =========================================

@app.get("/auth/youtube")
async def auth_youtube():
    """Redirect to YouTube OAuth."""
    state = os.urandom(16).hex()
    return RedirectResponse(get_authorization_url(state))


@app.get("/auth/callback")
async def auth_callback(code: str, state: str):
    """Handle OAuth callback and redirect to frontend."""
    try:
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

            # Also save as connected account
            async with get_db() as db:
                await db.execute(
                    """INSERT OR REPLACE INTO connected_accounts
                       (id, user_id, platform, platform_user_id, platform_username,
                        access_token, refresh_token, token_expires_at, status)
                       VALUES (?, ?, 'youtube', ?, ?, ?, ?, ?, 'connected')""",
                    (f"ca_{uuid.uuid4().hex[:12]}", user_id,
                     user_data["youtube_channel_id"], user_data["channel_name"],
                     access_token, tokens.get("refresh_token"),
                     user_data["token_expires_at"].isoformat()),
                )

            # Redirect to frontend with auth data
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
            return RedirectResponse(
                f"{frontend_url}/dashboard?user_id={user_id}&channel_name={user_data['channel_name']}"
            )
        return RedirectResponse("/dashboard?error=Failed to get channel data")
    except Exception as e:
        return RedirectResponse(f"/dashboard?error={str(e)}")


# =========================================
# Credits & User routes
# =========================================

@app.get("/credits/{user_id}")
async def get_user_credits(user_id: str):
    """Get pending credits for a user."""
    async with get_db() as db:
        async with db.execute("SELECT credits, tier FROM users WHERE id = ?", (user_id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                return dict(row)
            # Return default for new/unknown users
            return {"credits": 0, "tier": "free"}


# =========================================
# Connected Accounts routes
# =========================================

@app.get("/accounts/{user_id}")
async def get_connected_accounts(user_id: str):
    """List connected platform accounts for a user."""
    async with get_db() as db:
        async with db.execute(
            "SELECT id, platform, platform_username, status, created_at FROM connected_accounts WHERE user_id = ?",
            (user_id,),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


@app.delete("/accounts/{user_id}/{platform}")
async def disconnect_account(user_id: str, platform: str):
    """Disconnect a platform account."""
    async with get_db() as db:
        await db.execute(
            "UPDATE connected_accounts SET status = 'disconnected', updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND platform = ?",
            (user_id, platform),
        )
    return {"disconnected": platform}


# =========================================
# Niche & Style configuration routes
# =========================================

@app.get("/niches")
async def get_niches():
    """List all available niche presets."""
    return list_niches()


@app.get("/styles")
async def get_styles():
    """List all available style presets."""
    return list_styles()


# =========================================
# Content Templates routes
# =========================================

@app.get("/templates")
async def get_templates(niche: str | None = None):
    """List available content templates, optionally filtered by niche."""
    return list_templates(niche_id=niche)


@app.get("/templates/{template_id}")
async def get_template_detail(template_id: str):
    """Get template details with example script."""
    t = get_template(template_id)
    if not t:
        return JSONResponse({"error": f"Unknown template: {template_id}"}, status_code=404)
    return {
        "id": t.id,
        "name": t.name,
        "description": t.description,
        "emoji": t.emoji,
        "structure": t.structure,
        "example_script": t.example_script,
        "niche_tags": t.niche_tags,
        "prompt": t.to_prompt(),
    }


# =========================================
# Generation routes
# =========================================

@app.post("/generate")
async def generate_video(request: Request):
    """Generate a faceless video with the AI pipeline.

    Accepts: { niche: str, style: str, template?: str, user_id: str, prompt?: str }
    Creates a project, runs the agent team, and returns the project with results.
    """
    body = await request.json()
    niche_id = body.get("niche")
    style_id = body.get("style")
    template_id = body.get("template")
    user_id = body.get("user_id", "anonymous")
    prompt = body.get("prompt", "")

    # Validate niche and style
    niche = get_niche(niche_id) if niche_id else None
    style = get_style(style_id) if style_id else None

    if niche_id and not niche:
        return JSONResponse({"error": f"Unknown niche: {niche_id}"}, status_code=400)
    if style_id and not style:
        return JSONResponse({"error": f"Unknown style: {style_id}"}, status_code=400)

    # Create project
    title = f"{niche.name if niche else 'General'} - {style.name if style else 'Default'}"
    project = await create_project(user_id, title, niche_id=niche_id, style_id=style_id)

    # Create configured team
    team = create_faceless_team(niche_id=niche_id, style_id=style_id)

    # Build the generation prompt
    if not prompt:
        prompt = f"Generate a viral faceless short video"
        if niche:
            prompt += f" in the {niche.name} niche"
        if style:
            prompt += f" with {style.name} visual style"

    # Add template structure if specified
    template = get_template(template_id) if template_id else None
    if template:
        prompt += f"\n\n{template.to_prompt()}"

    # Run the team
    try:
        response = team.run(prompt)
        result_content = response.content if response else "Generation completed"

        return {
            "project": project,
            "result": str(result_content),
            "status": "completed"
        }
    except Exception as e:
        return JSONResponse(
            {"error": str(e), "project": project},
            status_code=500
        )


# =========================================
# Pipeline routes
# =========================================

@app.get("/pipelines/{user_id}")
async def list_pipelines(user_id: str):
    """List all pipelines for a user."""
    async with get_db() as db:
        async with db.execute(
            "SELECT * FROM pipelines WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


@app.post("/pipelines")
async def create_pipeline(request: Request):
    """Create a new pipeline (niche + style + template + platforms + schedule)."""
    body = await request.json()
    user_id = body.get("user_id")
    name = body.get("name", "My Pipeline")
    niche_id = body.get("niche")
    style_id = body.get("style")
    template_id = body.get("template", "top5_facts")
    platforms = body.get("platforms", "youtube")
    frequency = body.get("frequency", "daily")
    posting_times = body.get("posting_times", "09:00")
    timezone = body.get("timezone", "UTC")
    days_of_week = body.get("days_of_week", "mon,tue,wed,thu,fri,sat,sun")
    auto_approve = body.get("auto_approve", False)

    if not user_id or not niche_id or not style_id:
        return JSONResponse(
            {"error": "user_id, niche, and style are required"}, status_code=400
        )

    pipeline_id = f"pipe_{uuid.uuid4().hex[:12]}"

    async with get_db() as db:
        await db.execute(
            """INSERT INTO pipelines
               (id, user_id, name, niche, style, template, platforms,
                frequency, posting_times, timezone, days_of_week, auto_approve, enabled)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)""",
            (pipeline_id, user_id, name, niche_id, style_id, template_id,
             platforms, frequency, posting_times, timezone, days_of_week,
             1 if auto_approve else 0),
        )

    # Generate rolling schedule
    jobs = await generate_rolling_schedule(pipeline_id, days_ahead=7)

    return {
        "id": pipeline_id,
        "name": name,
        "niche": niche_id,
        "style": style_id,
        "template": template_id,
        "status": "active",
        "scheduled_jobs": len(jobs),
    }


@app.patch("/pipelines/{pipeline_id}")
async def update_pipeline(pipeline_id: str, request: Request):
    """Update a pipeline."""
    body = await request.json()

    set_clauses = []
    values = []
    for key in ["name", "niche", "style", "template", "platforms", "frequency",
                 "posting_times", "timezone", "days_of_week", "auto_approve", "enabled"]:
        if key in body:
            set_clauses.append(f"{key} = ?")
            val = body[key]
            if key in ("auto_approve", "enabled"):
                val = 1 if val else 0
            values.append(val)

    if not set_clauses:
        return JSONResponse({"error": "No fields to update"}, status_code=400)

    set_clauses.append("updated_at = CURRENT_TIMESTAMP")
    values.append(pipeline_id)

    async with get_db() as db:
        await db.execute(
            f"UPDATE pipelines SET {', '.join(set_clauses)} WHERE id = ?",
            tuple(values),
        )

    return {"id": pipeline_id, "updated": True}


@app.delete("/pipelines/{pipeline_id}")
async def delete_pipeline(pipeline_id: str):
    """Delete a pipeline and its content jobs."""
    async with get_db() as db:
        await db.execute("DELETE FROM content_jobs WHERE pipeline_id = ?", (pipeline_id,))
        await db.execute("DELETE FROM pipelines WHERE id = ?", (pipeline_id,))
    return {"deleted": True}


# =========================================
# Post Job routes
# =========================================

@app.post("/posts/queue")
async def queue_post(request: Request):
    """Queue a video for posting to platforms."""
    body = await request.json()

    user_id = body.get("user_id")
    video_url = body.get("video_url")
    title = body.get("title", "")
    description = body.get("description", "")
    hashtags = body.get("hashtags", "")
    platforms = body.get("platforms", "youtube")
    scheduled_at = body.get("scheduled_at")
    project_id = body.get("project_id")

    if not user_id or not video_url:
        return JSONResponse({"error": "user_id and video_url are required"}, status_code=400)

    job = await create_post_job(
        user_id=user_id,
        video_url=video_url,
        title=title,
        description=description,
        hashtags=hashtags,
        platforms=platforms,
        scheduled_at=scheduled_at,
        project_id=project_id,
    )
    return job


@app.get("/posts/{user_id}")
async def list_posts(user_id: str, limit: int = 50):
    """List post jobs for a user with their statuses."""
    return await get_post_jobs(user_id, limit)


# =========================================
# Calendar view route
# =========================================

@app.get("/calendar/{user_id}")
async def get_calendar(user_id: str, days: int = 30):
    """Get calendar view of posts for a user.

    Returns posts grouped by date with platform-specific statuses.
    """
    async with get_db() as db:
        # Get post jobs
        async with db.execute(
            """SELECT id, title, platforms, status, scheduled_at, posted_at, created_at
               FROM post_jobs WHERE user_id = ?
               ORDER BY COALESCE(scheduled_at, created_at) DESC
               LIMIT ?""",
            (user_id, days * 3),
        ) as cursor:
            posts = [dict(row) for row in await cursor.fetchall()]

        # Get content jobs from user's pipelines
        async with db.execute(
            """SELECT cj.id, cj.for_date, cj.status, cj.template_id,
                      p.name as pipeline_name, p.platforms
               FROM content_jobs cj
               JOIN pipelines p ON cj.pipeline_id = p.id
               WHERE p.user_id = ?
               ORDER BY cj.for_date DESC
               LIMIT ?""",
            (user_id, days),
        ) as cursor:
            content_jobs = [dict(row) for row in await cursor.fetchall()]

    # Group by date
    from collections import defaultdict
    calendar = defaultdict(lambda: {"posts": [], "content_jobs": []})

    for post in posts:
        date = (post.get("scheduled_at") or post.get("created_at") or "")[:10]
        if date:
            calendar[date]["posts"].append(post)

    for cj in content_jobs:
        date = cj.get("for_date", "")
        if date:
            calendar[date]["content_jobs"].append(cj)

    return dict(calendar)


# =========================================
# Schedule routes (legacy, kept for backward compat)
# =========================================

@app.post("/schedule")
async def create_schedule(request: Request):
    """Create or update an auto-posting schedule."""
    body = await request.json()
    user_id = body.get("user_id")
    niche_id = body.get("niche")
    style_id = body.get("style")
    platforms = body.get("platforms", "youtube")
    frequency = body.get("frequency", "daily")
    enabled = body.get("enabled", True)

    if not user_id or not niche_id or not style_id:
        return JSONResponse({"error": "user_id, niche, and style are required"}, status_code=400)

    schedule_id = f"sched_{uuid.uuid4().hex[:12]}"

    async with get_db() as db:
        # Check for existing schedule
        async with db.execute(
            "SELECT id FROM schedules WHERE user_id = ?", (user_id,)
        ) as cursor:
            existing = await cursor.fetchone()

        if existing:
            await db.execute(
                """UPDATE schedules SET niche = ?, style = ?, platforms = ?,
                   frequency = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE user_id = ?""",
                (niche_id, style_id, platforms, frequency, 1 if enabled else 0, user_id),
            )
            schedule_id = existing["id"]
        else:
            await db.execute(
                """INSERT INTO schedules (id, user_id, niche, style, platforms, frequency, enabled)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (schedule_id, user_id, niche_id, style_id, platforms, frequency, 1 if enabled else 0),
            )

    return {"id": schedule_id, "status": "active" if enabled else "paused"}


@app.get("/schedule/{user_id}")
async def get_schedule(user_id: str):
    """Get the auto-posting schedule for a user."""
    async with get_db() as db:
        async with db.execute(
            "SELECT * FROM schedules WHERE user_id = ?", (user_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return dict(row)
            return {"status": "none"}


@app.delete("/schedule/{user_id}")
async def delete_schedule(user_id: str):
    """Delete the auto-posting schedule for a user."""
    async with get_db() as db:
        await db.execute("DELETE FROM schedules WHERE user_id = ?", (user_id,))
    return {"deleted": True}


# =========================================
# Project routes
# =========================================

@app.get("/projects")
async def list_projects(user_id: str):
    """List all projects for user."""
    return await get_projects(user_id)


@app.post("/projects")
async def create_new_project(request: Request):
    """Create new project."""
    body = await request.json()
    return await create_project(body.get("user_id"), body.get("title"))


@app.get("/projects/{project_id}")
async def get_project_details(project_id: str, user_id: str):
    """Get project with all assets."""
    return await get_project(project_id, user_id)


@app.patch("/projects/{project_id}")
async def update_project_details(project_id: str, request: Request):
    """Update project."""
    body = await request.json()
    user_id = body.pop("user_id", None)
    return await update_project(project_id, user_id, body)


@app.delete("/projects/{project_id}")
async def remove_project(project_id: str, user_id: str):
    """Delete project."""
    await delete_project(project_id, user_id)
    return {"deleted": True}


# Trend routes
@app.post("/projects/{project_id}/trends")
async def add_project_trend(project_id: str, request: Request):
    """Add trend to project."""
    trend_data = await request.json()
    return await add_trend(project_id, trend_data)


# Asset routes
@app.post("/projects/{project_id}/assets")
async def add_project_asset(project_id: str, request: Request):
    """Add asset to project."""
    asset_data = await request.json()
    return await add_asset(project_id, asset_data)


# =========================================
# Setup AgentOS with the default team
# =========================================

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
