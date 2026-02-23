"""Faceless Video Factory - Main entry point."""

import io
import json
import os
import uuid
import zipfile
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables before any other imports
load_dotenv()

from agno.os import AgentOS
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.responses import RedirectResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from faceless.agents import faceless_team, create_faceless_team
from faceless.analytics import get_channel_analytics, score_hook, create_variant, get_variants
from faceless.auth import get_authorization_url, exchange_code_for_tokens, get_channel_data, save_user
from faceless.billing import (
    create_checkout_session, handle_stripe_webhook, get_transactions,
    check_plan_limit, PLANS
)
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
    allow_origins=[
        "http://localhost:3000", "http://localhost:3001", "http://localhost:3002",
        "http://localhost:7777", "http://localhost:8000",
        "http://127.0.0.1:3000", "http://127.0.0.1:8000",
    ],
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
    """Redirect to YouTube OAuth. Returns error JSON if credentials not configured."""
    client_id = os.getenv("YOUTUBE_CLIENT_ID")
    if not client_id:
        # Return error page instead of redirecting to Google with no client_id
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(
            f"{frontend_url}/settings?tab=connections&error=youtube_not_configured"
        )
    state = os.urandom(16).hex()
    return RedirectResponse(get_authorization_url(state))


@app.get("/auth/callback")
async def auth_callback(code: str, state: str):
    """Handle YouTube OAuth callback and redirect to frontend."""
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
                f"{frontend_url}/settings?tab=connections&user_id={user_id}&channel_name={user_data['channel_name']}&platform=youtube"
            )
        return RedirectResponse("/settings?tab=connections&error=Failed to get channel data")
    except Exception as e:
        return RedirectResponse(f"/settings?tab=connections&error={str(e)}")


@app.get("/auth/tiktok")
async def auth_tiktok():
    """TikTok OAuth - requires TikTok Developer account credentials."""
    client_key = os.getenv("TIKTOK_CLIENT_KEY")
    if not client_key:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(f"{frontend_url}/settings?tab=connections&error=tiktok_not_configured")

    redirect_uri = os.getenv("TIKTOK_REDIRECT_URI", "http://localhost:8000/auth/tiktok/callback")
    state = os.urandom(16).hex()
    scope = "user.info.basic,video.list,video.publish"
    url = (
        f"https://www.tiktok.com/v2/auth/authorize/"
        f"?client_key={client_key}"
        f"&response_type=code"
        f"&scope={scope}"
        f"&redirect_uri={redirect_uri}"
        f"&state={state}"
    )
    return RedirectResponse(url)


@app.get("/auth/tiktok/callback")
async def auth_tiktok_callback(code: str = "", state: str = "", error: str = ""):
    """Handle TikTok OAuth callback."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    if error or not code:
        return RedirectResponse(f"{frontend_url}/settings?tab=connections&error=tiktok_{error or 'cancelled'}")

    client_key = os.getenv("TIKTOK_CLIENT_KEY", "")
    client_secret = os.getenv("TIKTOK_CLIENT_SECRET", "")
    redirect_uri = os.getenv("TIKTOK_REDIRECT_URI", "http://localhost:8000/auth/tiktok/callback")

    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://open.tiktokapis.com/v2/oauth/token/",
                data={
                    "client_key": client_key,
                    "client_secret": client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
            )
            data = resp.json()
            access_token = data.get("access_token", "")
            open_id = data.get("open_id", "")

            # Get user info
            info_resp = await client.get(
                "https://open.tiktokapis.com/v2/user/info/",
                params={"fields": "display_name,avatar_url"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            info = info_resp.json().get("data", {}).get("user", {})
            username = info.get("display_name", open_id)

            return RedirectResponse(
                f"{frontend_url}/settings?tab=connections&platform=tiktok&tiktok_user={username}"
            )
    except Exception as e:
        return RedirectResponse(f"{frontend_url}/settings?tab=connections&error=tiktok_error")


@app.get("/auth/instagram")
async def auth_instagram():
    """Instagram Basic Display API OAuth."""
    client_id = os.getenv("INSTAGRAM_CLIENT_ID")
    if not client_id:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(f"{frontend_url}/settings?tab=connections&error=instagram_not_configured")

    redirect_uri = os.getenv("INSTAGRAM_REDIRECT_URI", "http://localhost:8000/auth/instagram/callback")
    url = (
        f"https://api.instagram.com/oauth/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=user_profile,user_media"
        f"&response_type=code"
    )
    return RedirectResponse(url)


@app.get("/auth/instagram/callback")
async def auth_instagram_callback(code: str = "", error: str = ""):
    """Handle Instagram OAuth callback."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    if error or not code:
        return RedirectResponse(f"{frontend_url}/settings?tab=connections&error=instagram_{error or 'cancelled'}")

    client_id = os.getenv("INSTAGRAM_CLIENT_ID", "")
    client_secret = os.getenv("INSTAGRAM_CLIENT_SECRET", "")
    redirect_uri = os.getenv("INSTAGRAM_REDIRECT_URI", "http://localhost:8000/auth/instagram/callback")

    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.instagram.com/oauth/access_token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
            )
            data = resp.json()
            ig_user_id = data.get("user_id", "")
            access_token = data.get("access_token", "")

            # Get username
            info_resp = await client.get(
                f"https://graph.instagram.com/{ig_user_id}",
                params={"fields": "id,username", "access_token": access_token},
            )
            info = info_resp.json()
            username = info.get("username", str(ig_user_id))

            return RedirectResponse(
                f"{frontend_url}/settings?tab=connections&platform=instagram&ig_user={username}"
            )
    except Exception as e:
        return RedirectResponse(f"{frontend_url}/settings?tab=connections&error=instagram_error")



# =========================================
# Credits & User routes
# =========================================

@app.get("/auth/me/{user_id}")
async def get_current_user(user_id: str):
    """Get current user data by ID (for session restoration)."""
    async with get_db() as db:
        async with db.execute(
            "SELECT id, youtube_channel_id, channel_name, channel_picture, tier, credits FROM users WHERE id = ?",
            (user_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return dict(row)
            return JSONResponse({"error": "User not found"}, status_code=404)


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
# AI Generation routes (step-by-step workflow)
# =========================================

@app.post("/projects/{project_id}/generate/trends")
async def generate_trends(project_id: str, request: Request):
    """Run trend research for a project using Pollinations text LLM."""
    body = await request.json()
    user_id = body.get("user_id", "anonymous")
    project = await get_project(project_id, user_id)
    if not project:
        return JSONResponse({"error": "Project not found"}, status_code=404)

    niche_id = project.get("niche") or body.get("niche")
    niche = get_niche(niche_id) if niche_id else None
    niche_name = niche.name if niche else (niche_id or "general")

    # Use Pollinations text LLM to generate structured trends
    import httpx

    prompt = (
        f"Generate 3 viral trend ideas for a '{niche_name}' faceless YouTube Shorts channel. "
        "Respond with ONLY a JSON array of 3 objects, no other text. "
        'Each object must have: "title" (catchy short title), '
        '"description" (2-3 sentence summary), '
        '"why_viral" (why this will get millions of views, 1 sentence), '
        '"competitive_analysis" (brief market opportunity). '
        "Example format: [{\"title\":\"...\",\"description\":\"...\",\"why_viral\":\"...\",\"competitive_analysis\":\"...\"}]"
    )

    trends_data = []
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://text.pollinations.ai/openai",
                json={
                    "model": "openai",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                },
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                # Try to parse JSON from content
                import re
                # Find JSON array
                match = re.search(r'\[.*\]', content, re.DOTALL)
                if match:
                    import ast
                    try:
                        trends_data = json.loads(match.group())
                    except Exception:
                        pass
    except Exception:
        pass

    # Fallback: creative hardcoded trends if API failed
    if not trends_data:
        fallback_ideas = {
            "horror": [
                ("The Real Story Behind [MISSING]", "A deep-dive into a famous missing persons case that was never solved. Shocking new evidence emerges.", "True crime content gets 10x more engagement than average — unsolved cases create addictive loops.", "Low supply of high-quality, research-backed horror content"),
                ("You Were NEVER Supposed to See This", "Classified documents reveal a government cover-up that's been hidden for decades.", "Conspiracy + horror = highest CTR combination on YouTube Shorts.", "Most creators don't do proper research — yours will stand out"),
                ("The Creature That Shouldn't Exist", "Scientists accidentally captured footage of something that defies all known biology.", "Unexplained phenomena videos average 85% watch-through rate.", "Niche with high engagement and low creator saturation"),
            ],
            "motivation": [
                ("The Habit That Made Billionaires Rich", "One simple daily ritual shared by Bezos, Musk, and Buffett that changed everything.", "Productivity + billionaire content is evergreen and shareable.", "Heavy competition but high reward — unique angles win"),
                ("Why 99% of People Stay Broke", "The psychological trap that keeps ordinary people from building wealth.", "Finance + psychology content performs 3x better than finance alone.", "Underserved niche combining two viral categories"),
                ("The 5AM Club Secret Nobody Talks About", "What really happens to your brain when you wake up at 5AM every day.", "Health + productivity crossover gets massive engagement from multiple audiences.", "Can repurpose to multiple platforms easily"),
            ],
        }
        ideas = fallback_ideas.get(niche_id, [
            (f"The Shocking Truth About {niche_name}", f"Revealing the hidden secrets of {niche_name} that most people never discover.", f"Curiosity-gap hooks perform extremely well in the {niche_name} space.", "First-mover advantage in underexplored territory"),
            (f"Why {niche_name} Changed Everything", f"A fascinating look at how {niche_name} has transformed modern life in ways few understand.", f"Educational content with surprise elements drives strong retention.", "Educational niche has evergreen demand"),
            (f"The {niche_name} Facts That Will Blow Your Mind", f"Ten incredible {niche_name} facts that most people have never heard before.", f"Top-N listicle format is proven to maximise watch time and shareability.", "Universal appeal — works across all demographics"),
        ])
        trends_data = [{"title": t, "description": d, "why_viral": w, "competitive_analysis": c} for t, d, w, c in ideas]

    # Store trends
    for td in trends_data[:3]:
        await add_trend(project_id, {
            "title": td.get("title", f"Trend for {niche_name}"),
            "description": td.get("description", ""),
            "why_viral": td.get("why_viral", ""),
            "competitive_analysis": td.get("competitive_analysis", ""),
            "sources": "",
        })

    await update_project(project_id, user_id, {"status": "trending"})
    return await get_project(project_id, user_id)


@app.post("/projects/{project_id}/generate/script")
async def generate_script(project_id: str, request: Request):
    """Generate a viral YouTube Shorts script using Pollinations text LLM."""
    body = await request.json()
    user_id = body.get("user_id", "anonymous")
    custom_prompt = body.get("prompt", "")
    voice = body.get("voice", "nova")

    project = await get_project(project_id, user_id)
    if not project:
        return JSONResponse({"error": "Project not found"}, status_code=404)

    niche_id = project.get("niche")
    niche = get_niche(niche_id) if niche_id else None
    style_id = project.get("style")
    style = get_style(style_id) if style_id else None

    # Find selected trend
    trends = project.get("trends", [])
    selected_id = project.get("selected_trend_id")
    selected_trend = next((t for t in trends if t["id"] == selected_id), trends[0] if trends else None)
    topic = selected_trend["title"] if selected_trend else project.get("title", niche_id or "viral topic")

    import httpx

    script_prompt = custom_prompt or (
        f"Write a viral 60-second YouTube Shorts / Instagram Reels script about: '{topic}'. "
        f"Channel niche: {niche.name if niche else (niche_id or 'general')}. "
        f"Visual style: {style.name if style else 'cinematic dark'}. "
        "Requirements:\n"
        "1. HOOK (first 3 seconds): Start with a shocking statement, question, or number that creates curiosity. Do NOT start with 'Hey guys' or 'Welcome'.\n"
        "2. BODY: Use short sentences, keep energy high, add [TEXT: overlay text] cues for key stats.\n"
        "3. CTA: End with a cliffhanger or strong call to action.\n"
        "Format: Write only the spoken script text. Max 180 words. No stage directions except [TEXT: ...] cues."
    )

    script_text = ""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://text.pollinations.ai/openai",
                json={
                    "model": "openai",
                    "messages": [
                        {"role": "system", "content": "You are a viral YouTube Shorts scriptwriter. Write punchy, engaging scripts that hook viewers in the first 3 seconds. Use short sentences and high energy."},
                        {"role": "user", "content": script_prompt}
                    ],
                },
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                script_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    except Exception:
        pass

    # Fallback to Mistral agent if Pollinations fails
    if not script_text:
        try:
            team = create_faceless_team(niche_id=niche_id, style_id=style_id)
            response = team.run(script_prompt)
            script_text = str(response.content) if response else ""
        except Exception:
            pass

    if not script_text:
        script_text = f"[HOOK] Did you know that {topic} is one of the most shocking things ever discovered?\n\n[BODY] This is something most people never learn about. The truth will change how you see everything.\n\n[TEXT: Mind-blowing fact here]\n\nAnd the craziest part? It gets even more unbelievable from here.\n\n[CTA] Follow for more secrets like this. You will NOT believe what comes next."

    # Save script as asset
    await add_asset(project_id, {
        "type": "script",
        "url": None,
        "prompt": script_text,
        "metadata": json.dumps({"word_count": len(script_text.split()), "topic": topic, "voice": voice}),
        "status": "ready",
    })

    await update_project(project_id, user_id, {"status": "scripting"})
    return await get_project(project_id, user_id)



@app.post("/projects/{project_id}/generate/media")
async def generate_media(project_id: str, request: Request):
    """Generate video, audio, and thumbnail for a project using Pollinations.ai.
    Assets are saved immediately as 'processing', then updated to 'ready' with real URLs.
    """
    body = await request.json()
    user_id = body.get("user_id", "anonymous")
    asset_types = body.get("types", ["video", "audio", "thumbnail"])

    project = await get_project(project_id, user_id)
    if not project:
        return JSONResponse({"error": "Project not found"}, status_code=404)

    # Get script for generation
    assets = project.get("assets", {})
    script = assets.get("script", {}).get("prompt", project.get("title", "viral faceless video"))
    title = project.get("title", "video")
    niche_id = project.get("niche", "general")
    style_id = project.get("style", "cinematic_dark")

    # Save processing placeholders immediately
    for asset_type in asset_types:
        await add_asset(project_id, {
            "type": asset_type,
            "url": None,
            "prompt": f"Generating {asset_type}...",
            "metadata": json.dumps({"queued_at": datetime.now().isoformat()}),
            "status": "processing",
        })

    # Advance to production status
    await update_project(project_id, user_id, {"status": "production"})

    # Start real generation in background
    import asyncio
    asyncio.create_task(_generate_assets_background(project_id, user_id, asset_types, script, title, niche_id, style_id))

    return await get_project(project_id, user_id)


async def _generate_assets_background(
    project_id: str, user_id: str, asset_types: list[str],
    script: str, title: str, niche_id: str, style_id: str
):
    """Background task: call Pollinations.ai APIs and update assets with real URLs."""
    import asyncio
    import httpx
    from urllib.parse import quote

    POLLINATIONS_BASE = "https://gen.pollinations.ai"

    # Short hook text for audio (~50 words max for quick generation)
    audio_text = " ".join(script.split()[:60])
    style_map = {
        "cinematic_dark": "dark cinematic atmospheric, no faces",
        "bright_energetic": "bright vibrant energetic",
        "minimal_clean": "minimal clean white background",
        "retro_vintage": "retro vintage film grain",
        "neon_futuristic": "neon cyberpunk glowing",
    }
    visual_style = style_map.get(style_id, "cinematic dark atmospheric")
    video_prompt = f"{title}, {visual_style}, faceless, engaging, viral"
    thumb_prompt = f"{title}, {visual_style}, bold text overlay, YouTube thumbnail, high contrast"

    async def gen_audio():
        if "audio" not in asset_types:
            return
        try:
            encoded = quote(audio_text[:300], safe="")
            # Use Pollinations TTS
            url = f"https://text.pollinations.ai/{encoded}?voice=nova&model=openai-audio"
            async with httpx.AsyncClient(timeout=60) as c:
                r = await c.get(url, follow_redirects=True)
                if r.status_code == 200:
                    final_url = str(r.url)
                    await add_asset(project_id, {
                        "type": "audio",
                        "url": final_url,
                        "prompt": audio_text[:300],
                        "metadata": json.dumps({"voice": "nova", "provider": "pollinations"}),
                        "status": "ready",
                    })
                    return
        except Exception as e:
            pass
        await add_asset(project_id, {"type": "audio", "status": "failed", "url": None, "prompt": audio_text[:300], "metadata": "{}"})

    async def gen_thumbnail():
        if "thumbnail" not in asset_types:
            return
        try:
            encoded = quote(thumb_prompt, safe="")
            url = f"https://image.pollinations.ai/prompt/{encoded}?width=1280&height=720&model=flux&nologo=true"
            # Image URL is direct (no need to download, just store URL)
            final_url = url
            await add_asset(project_id, {
                "type": "thumbnail",
                "url": final_url,
                "prompt": thumb_prompt,
                "metadata": json.dumps({"model": "flux", "provider": "pollinations"}),
                "status": "ready",
            })
        except Exception:
            await add_asset(project_id, {"type": "thumbnail", "status": "failed", "url": None, "prompt": thumb_prompt, "metadata": "{}"})

    async def gen_video():
        if "video" not in asset_types:
            return
        try:
            encoded = quote(video_prompt, safe="")
            url = f"{POLLINATIONS_BASE}/video/{encoded}?model=seedance"
            async with httpx.AsyncClient(timeout=180) as c:
                r = await c.get(url, follow_redirects=True)
                if r.status_code == 200:
                    final_url = str(r.url)
                    await add_asset(project_id, {
                        "type": "video",
                        "url": final_url,
                        "prompt": video_prompt,
                        "metadata": json.dumps({"model": "seedance", "provider": "pollinations"}),
                        "status": "ready",
                    })
                    return
        except Exception:
            pass
        # Fallback: mark failed
        await add_asset(project_id, {"type": "video", "status": "failed", "url": None, "prompt": video_prompt, "metadata": "{}"})

    # Run thumbnail and audio in parallel (fast), video may take longer
    await asyncio.gather(gen_thumbnail(), gen_audio())
    await gen_video()

    # Mark project as completed if all ready
    p = await get_project(project_id, user_id)
    if p:
        all_ready = all(
            a.get("status") in ("ready", "failed")
            for a in (p.get("assets") or {}).values()
        )
        if all_ready:
            await update_project(project_id, user_id, {"status": "completed"})


@app.get("/tts/preview")
async def tts_preview(voice: str = "nova", text: str = "Welcome to Facelessly. This is how I sound."):
    """Proxy TTS preview audio from Pollinations to avoid CORS issues."""
    import httpx
    from urllib.parse import quote
    encoded = quote(text[:200], safe="")
    url = f"https://text.pollinations.ai/{encoded}?voice={voice}&model=openai-audio"
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(url, follow_redirects=True)
            if r.status_code == 200:
                return StreamingResponse(
                    iter([r.content]),
                    media_type=r.headers.get("content-type", "audio/mpeg"),
                    headers={"Content-Disposition": f'inline; filename="preview_{voice}.mp3"'},
                )
    except Exception:
        pass
    return JSONResponse({"error": "TTS unavailable"}, status_code=503)




@app.get("/projects/{project_id}/export")
async def export_project(project_id: str, user_id: str):
    """Export all project assets as a ZIP download."""
    project = await get_project(project_id, user_id)
    if not project:
        return JSONResponse({"error": "Project not found"}, status_code=404)

    assets = project.get("assets", {})
    title = project.get("title", "project").replace(" ", "_")

    # Build ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add metadata JSON
        metadata = {
            "project": project.get("title"),
            "niche": project.get("niche"),
            "style": project.get("style"),
            "created_at": project.get("created_at"),
            "assets": {k: v.get("url") for k, v in assets.items() if v.get("url")},
        }
        zf.writestr("metadata.json", json.dumps(metadata, indent=2))

        # Add script text if available
        if assets.get("script") and assets["script"].get("prompt"):
            zf.writestr(f"{title}_script.txt", assets["script"]["prompt"])

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{title}_export.zip"'},
    )


# =========================================
# Phase 7: Billing & Credits
# =========================================

@app.post("/auth/logout")
async def logout(request: Request):
    """Clear user session (client should also clear localStorage)."""
    return {"success": True, "message": "Logged out"}


@app.post("/billing/checkout")
async def create_billing_session(request: Request):
    """Create a Stripe checkout session for subscription or credit pack."""
    body = await request.json()
    user_id = body.get("user_id")
    tier = body.get("tier", "pro")
    base_url = body.get("base_url", "http://localhost:3000")
    if not user_id:
        return JSONResponse({"error": "user_id required"}, status_code=400)
    result = await create_checkout_session(
        user_id=user_id,
        tier=tier,
        success_url=f"{base_url}/billing/success",
        cancel_url=f"{base_url}/billing",
    )
    return result


@app.post("/billing/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    return await handle_stripe_webhook(payload, sig_header)


@app.get("/billing/plans")
async def get_plans():
    """Return all pricing plans."""
    return PLANS


@app.get("/billing/check/{user_id}/{resource}")
async def check_limit(user_id: str, resource: str):
    """Check if user has hit plan limits."""
    return await check_plan_limit(user_id, resource)


@app.get("/transactions/{user_id}")
async def get_transaction_history(user_id: str, limit: int = 20):
    """Get transaction history for a user."""
    return await get_transactions(user_id, limit)


# =========================================
# Phase 8: Content Quality
# =========================================

@app.post("/projects/{project_id}/score/hook")
async def score_project_hook(project_id: str, request: Request):
    """Score the hook strength of a project's script."""
    body = await request.json()
    user_id = body.get("user_id", "anonymous")
    script = body.get("script", "")

    # If no script in body, try to load from project assets
    if not script:
        project = await get_project(project_id, user_id)
        if project and project.get("assets", {}).get("script"):
            script = project["assets"]["script"].get("prompt", "")

    if not script:
        return JSONResponse({"error": "No script to score"}, status_code=400)

    result = await score_hook(script)
    return result


# =========================================
# Phase 10: Analytics & A/B Tests
# =========================================

@app.get("/analytics/{user_id}")
async def get_analytics(user_id: str, days: int = 28):
    """Get YouTube channel analytics for the last N days."""
    return await get_channel_analytics(user_id, days)


@app.post("/projects/{project_id}/variants")
async def create_ab_variant(project_id: str, request: Request):
    """Create a script variant for A/B testing."""
    body = await request.json()
    user_id = body.get("user_id", "anonymous")
    return await create_variant(project_id, user_id, body)


@app.get("/projects/{project_id}/variants")
async def get_ab_variants(project_id: str, user_id: str = "anonymous"):
    """Get all script variants for A/B testing."""
    return await get_variants(project_id)


# =========================================
# Asset PATCH endpoint
# =========================================

@app.patch("/assets/{asset_id}")
async def update_asset(asset_id: str, request: Request):
    """Update asset prompt, status, or url."""
    body = await request.json()
    allowed = {"prompt", "status", "url", "metadata"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return JSONResponse({"error": "No valid fields to update"}, status_code=400)

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + ["CURRENT_TIMESTAMP", asset_id]

    async with get_db() as db:
        await db.execute(
            f"UPDATE assets SET {set_clause}, updated_at = ? WHERE id = ?",
            values,
        )
        await db.commit()
        async with db.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else JSONResponse({"error": "Not found"}, status_code=404)


# =========================================
# Export: CapCut + Canva
# =========================================

@app.get("/projects/{project_id}/export/capcut")
async def export_capcut(project_id: str, user_id: str = "anonymous"):
    """Generate a CapCut-compatible project manifest."""
    project = await get_project(project_id, user_id)
    if not project:
        return JSONResponse({"error": "Project not found"}, status_code=404)

    assets = project.get("assets", {})
    # CapCut Draft JSON format (simplified)
    capcut_manifest = {
        "version": "3.0.0",
        "name": project.get("title", "Untitled"),
        "tracks": [
            {
                "type": "video",
                "segments": [{"material_url": assets.get("video", {}).get("url", "")}]
            },
            {
                "type": "audio",
                "segments": [{"material_url": assets.get("audio", {}).get("url", "")}]
            },
        ],
        "cover": assets.get("thumbnail", {}).get("url", ""),
        "script": assets.get("script", {}).get("prompt", ""),
        "facelessly_meta": {
            "project_id": project_id,
            "niche": project.get("niche"),
            "style": project.get("style"),
        },
    }
    capcut_json = json.dumps(capcut_manifest, indent=2).encode()
    return StreamingResponse(
        iter([capcut_json]),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{project_id}_capcut.json"'},
    )


@app.get("/projects/{project_id}/export/canva")
async def export_canva(project_id: str, user_id: str = "anonymous"):
    """Return a Canva deep link for thumbnail editing."""
    project = await get_project(project_id, user_id)
    if not project:
        return JSONResponse({"error": "Project not found"}, status_code=404)

    assets = project.get("assets", {})
    thumbnail_url = assets.get("thumbnail", {}).get("url", "")
    # Canva deep link: opens editor pre-loaded with image as background
    import urllib.parse
    canva_url = "https://www.canva.com/design/create"
    if thumbnail_url:
        params = urllib.parse.urlencode({"backgroundImageUrl": thumbnail_url})
        canva_url = f"{canva_url}?{params}"
    return {"canva_url": canva_url, "thumbnail_url": thumbnail_url}


# =========================================
# SSE: Live generation progress
# =========================================

import asyncio as _asyncio

@app.get("/projects/{project_id}/progress")
async def generation_progress(project_id: str, user_id: str = "anonymous"):
    """SSE stream: poll asset statuses every 3s until all are ready/failed."""
    async def event_generator():
        for _ in range(60):  # max 3 min
            project = await get_project(project_id, user_id)
            if not project:
                yield f"data: {json.dumps({'error': 'project not found'})}\n\n"
                break
            assets = project.get("assets", {})
            statuses = {k: v.get("status") for k, v in assets.items()}
            all_done = all(s in ("ready", "failed") for s in statuses.values()) if statuses else False
            yield f"data: {json.dumps({'statuses': statuses, 'done': all_done})}\n\n"
            if all_done:
                break
            await _asyncio.sleep(3)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# =========================================
# Music Library
# =========================================

ROYALTY_FREE_TRACKS = [
    {"id": "lofi_chill_1",    "name": "Lo-Fi Chill",         "mood": "calm",       "bpm": 75,  "duration": 120, "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"},
    {"id": "epic_cinematic_1","name": "Epic Cinematic Rise",  "mood": "dramatic",   "bpm": 120, "duration": 90,  "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"},
    {"id": "dark_horror_1",   "name": "Dark Tension",         "mood": "horror",     "bpm": 60,  "duration": 100, "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"},
    {"id": "upbeat_energy_1", "name": "Upbeat Energy",        "mood": "energetic",  "bpm": 140, "duration": 80,  "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"},
    {"id": "neon_pulse_1",    "name": "Neon Pulse",           "mood": "futuristic", "bpm": 130, "duration": 95,  "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"},
    {"id": "retro_vinyl_1",   "name": "Retro Vinyl",          "mood": "nostalgic",  "bpm": 95,  "duration": 110, "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"},
    {"id": "motivational_1",  "name": "Rise and Conquer",     "mood": "motivation", "bpm": 125, "duration": 85,  "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"},
    {"id": "mystery_1",       "name": "Mystery Suspense",     "mood": "suspense",   "bpm": 85,  "duration": 105, "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"},
]

@app.get("/music")
async def get_music_library(mood: str | None = None):
    """Return royalty-free music tracks, optionally filtered by mood."""
    tracks = ROYALTY_FREE_TRACKS
    if mood:
        tracks = [t for t in tracks if t["mood"] == mood]
    return {"tracks": tracks, "total": len(tracks)}


# =========================================
# ElevenLabs / Voice providers
# =========================================

BUILTIN_VOICES = [
    {"id": "nova",    "name": "Nova",    "provider": "openai",     "gender": "female", "style": "bright"},
    {"id": "alloy",   "name": "Alloy",   "provider": "openai",     "gender": "neutral","style": "clean"},
    {"id": "echo",    "name": "Echo",    "provider": "openai",     "gender": "male",   "style": "cinematic"},
    {"id": "fable",   "name": "Fable",   "provider": "openai",     "gender": "male",   "style": "retro"},
    {"id": "shimmer", "name": "Shimmer", "provider": "openai",     "gender": "female", "style": "futuristic"},
    {"id": "onyx",    "name": "Onyx",    "provider": "openai",     "gender": "male",   "style": "deep"},
    {"id": "el_rachel","name": "Rachel (ElevenLabs)","provider": "elevenlabs","gender":"female","style":"conversational","premium":True},
    {"id": "el_adam",  "name": "Adam (ElevenLabs)",  "provider": "elevenlabs","gender":"male",  "style":"narrator","premium":True},
    {"id": "el_bella", "name": "Bella (ElevenLabs)", "provider": "elevenlabs","gender":"female","style":"soft","premium":True},
]

@app.get("/voices")
async def list_voices(premium: bool = False):
    """List available TTS voices. premium=true shows ElevenLabs voices."""
    voices = BUILTIN_VOICES
    if not premium:
        voices = [v for v in voices if not v.get("premium")]
    return {"voices": voices}



# =========================================
# Health check
# =========================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "0.2.0"}


# =========================================
# Book Content Ingestion
# =========================================

MULTILINGUAL_VOICES = [
    # Japanese voices (user has these)
    {"id": "ja_female_1", "name": "Sakura", "language": "ja", "lang_name": "Japanese", "gender": "female", "provider": "browser_tts", "flag": "🇯🇵", "pitch": 1.3, "rate": 0.95},
    {"id": "ja_male_1",   "name": "Haruto",  "language": "ja", "lang_name": "Japanese", "gender": "male",   "provider": "browser_tts", "flag": "🇯🇵", "pitch": 0.8, "rate": 0.9},
    # English voices (generated)
    {"id": "nova",    "name": "Nova",    "language": "en", "lang_name": "English", "gender": "female", "provider": "pollinations", "flag": "🇺🇸", "pitch": 1.2, "rate": 1.0},
    {"id": "onyx",    "name": "Onyx",    "language": "en", "lang_name": "English", "gender": "male",   "provider": "pollinations", "flag": "🇺🇸", "pitch": 0.7, "rate": 0.9},
    {"id": "echo",    "name": "Echo",    "language": "en", "lang_name": "English", "gender": "male",   "provider": "pollinations", "flag": "🇺🇸", "pitch": 0.9, "rate": 1.15},
    {"id": "shimmer", "name": "Shimmer", "language": "en", "lang_name": "English", "gender": "female", "provider": "pollinations", "flag": "🇺🇸", "pitch": 1.3, "rate": 0.85},
    {"id": "fable",   "name": "Fable",   "language": "en", "lang_name": "English", "gender": "male",   "provider": "pollinations", "flag": "🇺🇸", "pitch": 0.85,"rate": 0.95},
    {"id": "alloy",   "name": "Alloy",   "language": "en", "lang_name": "English", "gender": "neutral","provider": "pollinations", "flag": "🇺🇸", "pitch": 1.0, "rate": 1.05},
    # Spanish
    {"id": "es_female_1", "name": "Sofia",  "language": "es", "lang_name": "Spanish", "gender": "female", "provider": "browser_tts", "flag": "🇪🇸", "pitch": 1.2, "rate": 1.0},
    {"id": "es_male_1",   "name": "Carlos", "language": "es", "lang_name": "Spanish", "gender": "male",   "provider": "browser_tts", "flag": "🇪🇸", "pitch": 0.8, "rate": 0.95},
    # French
    {"id": "fr_female_1", "name": "Amélie", "language": "fr", "lang_name": "French",  "gender": "female", "provider": "browser_tts", "flag": "🇫🇷", "pitch": 1.2, "rate": 1.0},
    {"id": "fr_male_1",   "name": "Pierre", "language": "fr", "lang_name": "French",  "gender": "male",   "provider": "browser_tts", "flag": "🇫🇷", "pitch": 0.8, "rate": 0.95},
    # Hindi
    {"id": "hi_female_1", "name": "Priya",  "language": "hi", "lang_name": "Hindi",   "gender": "female", "provider": "browser_tts", "flag": "🇮🇳", "pitch": 1.2, "rate": 1.0},
    {"id": "hi_male_1",   "name": "Arjun",  "language": "hi", "lang_name": "Hindi",   "gender": "male",   "provider": "browser_tts", "flag": "🇮🇳", "pitch": 0.8, "rate": 0.95},
    # Korean
    {"id": "ko_female_1", "name": "Minji",  "language": "ko", "lang_name": "Korean",  "gender": "female", "provider": "browser_tts", "flag": "🇰🇷", "pitch": 1.2, "rate": 1.0},
    # Arabic
    {"id": "ar_male_1",   "name": "Khalid", "language": "ar", "lang_name": "Arabic",  "gender": "male",   "provider": "browser_tts", "flag": "🇸🇦", "pitch": 0.85,"rate": 0.95},
    # Chinese
    {"id": "zh_female_1", "name": "Mei",    "language": "zh", "lang_name": "Chinese", "gender": "female", "provider": "browser_tts", "flag": "🇨🇳", "pitch": 1.2, "rate": 1.0},
    # German
    {"id": "de_male_1",   "name": "Klaus",  "language": "de", "lang_name": "German",  "gender": "male",   "provider": "browser_tts", "flag": "🇩🇪", "pitch": 0.85,"rate": 0.95},
    # Portuguese
    {"id": "pt_female_1", "name": "Ana",    "language": "pt", "lang_name": "Portuguese","gender": "female","provider": "browser_tts", "flag": "🇧🇷", "pitch": 1.2, "rate": 1.0},
]

@app.get("/voices/multilingual")
async def list_multilingual_voices(language: str | None = None):
    """List all multilingual voices, optionally filtered by language code."""
    voices = MULTILINGUAL_VOICES
    if language:
        voices = [v for v in voices if v["language"] == language]
    # Group by language
    grouped: dict = {}
    for v in voices:
        lang = v["lang_name"]
        if lang not in grouped:
            grouped[lang] = {"lang_name": lang, "language": v["language"], "flag": v["flag"], "voices": []}
        grouped[lang]["voices"].append(v)
    return {"voices": voices, "grouped": list(grouped.values()), "total": len(voices)}


@app.post("/upload/book")
async def upload_book(
    file: UploadFile = File(None),
    text: str = Form(None),
    num_scripts: int = Form(10),
    niche: str = Form("general"),
):
    """Upload a book (PDF/TXT) or paste text, extract content and generate script topics.
    
    Returns a list of script topics derived from the book's chapters/sections.
    """
    import re
    import httpx
    from urllib.parse import quote

    content = ""

    if file and file.filename:
        raw = await file.read()
        filename = file.filename.lower()
        if filename.endswith(".txt"):
            content = raw.decode("utf-8", errors="replace")
        elif filename.endswith(".pdf"):
            # Simple PDF text extraction without heavy deps
            try:
                import io
                text_parts = []
                # Basic PDF text extraction: find stream objects
                pdf_text = raw.decode("latin-1", errors="replace")
                # Extract text between BT and ET markers (PDF text operators)
                streams = re.findall(r'BT(.*?)ET', pdf_text, re.DOTALL)
                for stream in streams[:100]:
                    # Extract Tj and TJ text operators
                    texts = re.findall(r'\((.*?)\)\s*T[jJ]', stream)
                    text_parts.extend(texts)
                content = " ".join(text_parts)
                if len(content) < 100:
                    # Fallback: just decode and clean
                    content = re.sub(r'[^\x20-\x7E\n]', ' ', pdf_text)
                    content = re.sub(r'\s+', ' ', content)
            except Exception:
                content = raw.decode("utf-8", errors="replace")
        elif filename.endswith(".epub"):
            content = raw.decode("utf-8", errors="replace")
            # Strip XML tags
            content = re.sub(r'<[^>]+>', ' ', content)
    elif text:
        content = text

    if not content or len(content.strip()) < 20:
        return JSONResponse({"error": "No readable content found. Please upload a TXT or PDF file, or paste text."}, status_code=400)

    # Limit to 8000 chars for API
    content_snippet = content[:8000].strip()
    num_scripts = max(5, min(15, num_scripts))

    # Use Pollinations to extract topics
    prompt = (
        f"This is content from a book about {niche}:\n\n{content_snippet}\n\n"
        f"Extract exactly {num_scripts} specific, engaging short-video topics from this book. "
        "Each topic should be something that can be turned into a 60-second viral YouTube Short or Instagram Reel. "
        "Respond with ONLY a JSON array of objects with keys: "
        '"title" (catchy hook-style title, max 10 words), '
        '"description" (2-sentence summary of what the video covers), '
        '"source_quote" (a key quote or fact from the book to anchor the script). '
        f"Return exactly {num_scripts} items."
    )

    topics = []
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            resp = await client.post(
                "https://text.pollinations.ai/openai",
                json={
                    "model": "openai",
                    "messages": [{"role": "user", "content": prompt}],
                },
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                raw_content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                # Parse JSON array
                match = re.search(r'\[.*\]', raw_content, re.DOTALL)
                if match:
                    try:
                        topics = json.loads(match.group())
                    except Exception:
                        pass
    except Exception:
        pass

    if not topics:
        # Fallback: split by paragraphs
        paragraphs = [p.strip() for p in re.split(r'\n{2,}', content_snippet) if len(p.strip()) > 50]
        topics = [
            {
                "title": f"Key Insight #{i+1} from the Book",
                "description": para[:200],
                "source_quote": para[:100],
            }
            for i, para in enumerate(paragraphs[:num_scripts])
        ]

    return {
        "topics": topics[:num_scripts],
        "total": len(topics[:num_scripts]),
        "content_length": len(content),
        "niche": niche,
    }


# =========================================
# Series Assembly (10-15 scripts → 1 video)
# =========================================

ART_STYLE_PREVIEWS = {
    "cinematic_dark": {
        "preview_url": "https://image.pollinations.ai/prompt/dark%20cinematic%20atmospheric%20night%20city%20moody%20film%20noir%20faceless?width=400&height=711&model=flux&nologo=true&seed=42",
        "description": "Dark, moody, atmospheric. Perfect for horror, mystery, or luxury.",
        "prompt_suffix": "dark cinematic atmospheric moody dramatic lighting",
        "colors": ["#0a0a0f", "#1a1a2e", "#4a0e8f"],
    },
    "bright_energetic": {
        "preview_url": "https://image.pollinations.ai/prompt/bright%20vibrant%20energetic%20modern%20colorful%20lifestyle%20upbeat%20faceless?width=400&height=711&model=flux&nologo=true&seed=43",
        "description": "Vibrant, colorful, fast-paced edits. Great for motivation or finance.",
        "prompt_suffix": "bright vibrant energetic colorful upbeat modern",
        "colors": ["#ff6b35", "#f7c59f", "#efefd0"],
    },
    "minimal_clean": {
        "preview_url": "https://image.pollinations.ai/prompt/minimal%20clean%20white%20simple%20elegant%20modern%20abstract%20geometric?width=400&height=711&model=flux&nologo=true&seed=44",
        "description": "Simple, elegant, whitespace-forward. Works for edu or finance.",
        "prompt_suffix": "minimal clean white simple elegant geometric",
        "colors": ["#ffffff", "#f5f5f5", "#222222"],
    },
    "retro_vintage": {
        "preview_url": "https://image.pollinations.ai/prompt/retro%20vintage%20film%20grain%20old%20photo%20nostalgic%20sepia%20analog?width=400&height=711&model=flux&nologo=true&seed=45",
        "description": "Nostalgic, VHS-grain aesthetic. Great for history or true crime.",
        "prompt_suffix": "retro vintage film grain analog nostalgia sepia",
        "colors": ["#c19a6b", "#8b5e3c", "#f5e6c8"],
    },
    "neon_futuristic": {
        "preview_url": "https://image.pollinations.ai/prompt/neon%20cyberpunk%20futuristic%20glowing%20electric%20sci-fi%20dark%20city?width=400&height=711&model=flux&nologo=true&seed=46",
        "description": "Cyberpunk neon glow. Ideal for tech, AI, or space content.",
        "prompt_suffix": "neon cyberpunk futuristic glowing electric sci-fi",
        "colors": ["#00ffff", "#ff00ff", "#0d0d1a"],
    },
    "anime_illustrated": {
        "preview_url": "https://image.pollinations.ai/prompt/anime%20illustrated%20japanese%20animation%20style%20colorful%20vivid%20cartoon?width=400&height=711&model=flux&nologo=true&seed=47",
        "description": "Anime/illustrated style. Perfect for Japanese content or storytelling.",
        "prompt_suffix": "anime illustrated japanese animation style vivid colorful",
        "colors": ["#ff6b9d", "#c77dff", "#48cae4"],
    },
    "horror_glitch": {
        "preview_url": "https://image.pollinations.ai/prompt/horror%20glitch%20distorted%20dark%20scary%20red%20static%20corrupted?width=400&height=711&model=flux&nologo=true&seed=48",
        "description": "Dark, glitchy, unsettling. Ideal for horror or suspense channels.",
        "prompt_suffix": "horror glitch distorted dark scary red static corrupted",
        "colors": ["#1a0000", "#8b0000", "#ff0000"],
    },
    "documentary": {
        "preview_url": "https://image.pollinations.ai/prompt/documentary%20realistic%20photographic%20journalistic%20natural%20lighting?width=400&height=711&model=flux&nologo=true&seed=49",
        "description": "Realistic, photographic. Works for true stories or education.",
        "prompt_suffix": "documentary realistic photographic natural lighting",
        "colors": ["#4a4a4a", "#8a8a8a", "#f0f0f0"],
    },
}

@app.get("/art-styles")
async def get_art_styles():
    """Return all art styles with preview image URLs."""
    styles = []
    for style_id, data in ART_STYLE_PREVIEWS.items():
        styles.append({
            "id": style_id,
            "name": style_id.replace("_", " ").title(),
            **data
        })
    return {"styles": styles}


MUSIC_PREVIEW_TRACKS = [
    {
        "id": "suspense_dark",
        "name": "Dark Suspense",
        "genre": "Horror/Mystery",
        "mood": "suspense",
        "bpm": 65,
        "duration": "2:30",
        "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
        "tags": ["horror", "mystery", "thriller"],
    },
    {
        "id": "epic_orchestra",
        "name": "Epic Orchestra",
        "genre": "Cinematic",
        "mood": "dramatic",
        "bpm": 120,
        "duration": "3:15",
        "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        "tags": ["cinematic", "epic", "motivation"],
    },
    {
        "id": "lofi_chill",
        "name": "Lo-Fi Chill",
        "genre": "Ambient",
        "mood": "calm",
        "bpm": 75,
        "duration": "4:00",
        "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        "tags": ["calm", "study", "ambient"],
    },
    {
        "id": "upbeat_pop",
        "name": "Upbeat Energy",
        "genre": "Pop/EDM",
        "mood": "energetic",
        "bpm": 128,
        "duration": "2:45",
        "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        "tags": ["finance", "motivation", "energy"],
    },
    {
        "id": "emotional_piano",
        "name": "Emotional Piano",
        "genre": "Classical",
        "mood": "emotional",
        "bpm": 72,
        "duration": "3:30",
        "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
        "tags": ["story", "emotional", "drama"],
    },
    {
        "id": "trap_bass",
        "name": "Hard Trap",
        "genre": "Hip-Hop",
        "mood": "intense",
        "bpm": 140,
        "duration": "2:20",
        "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
        "tags": ["hip-hop", "hype", "intense"],
    },
    {
        "id": "neon_pulse",
        "name": "Neon Pulse",
        "genre": "Electronic",
        "mood": "futuristic",
        "bpm": 130,
        "duration": "2:55",
        "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
        "tags": ["tech", "futuristic", "neon"],
    },
    {
        "id": "retro_vinyl",
        "name": "Retro Vinyl",
        "genre": "Vintage",
        "mood": "nostalgic",
        "bpm": 95,
        "duration": "3:10",
        "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        "tags": ["history", "vintage", "nostalgia"],
    },
    {
        "id": "none",
        "name": "No Music",
        "genre": "",
        "mood": "none",
        "bpm": 0,
        "duration": "",
        "preview_url": None,
        "tags": [],
    },
]

@app.get("/music/library")
async def get_music_library_v2(mood: str | None = None, tag: str | None = None):
    """Return music tracks with preview URLs, filter by mood or tag."""
    tracks = MUSIC_PREVIEW_TRACKS
    if mood:
        tracks = [t for t in tracks if t["mood"] == mood]
    if tag:
        tracks = [t for t in tracks if tag in t.get("tags", [])]
    return {"tracks": tracks, "total": len(tracks)}


@app.post("/assemble")
async def assemble_series(request: Request):
    """Assemble 10-15 scripts into a single video series.
    
    Body: {
        user_id: str,
        scripts: [{ title, script_text, voice_id, language }],  # 10-15 items
        settings: { music_id, caption_style, art_style, output_format }
    }
    
    Returns: { job_id, status, estimated_minutes } 
    Mock pipeline — returns placeholders with generation instructions.
    """
    body = await request.json()
    user_id = body.get("user_id", "anonymous")
    scripts = body.get("scripts", [])
    settings = body.get("settings", {})

    if not scripts:
        return JSONResponse({"error": "scripts array is required"}, status_code=400)
    if len(scripts) > 15:
        return JSONResponse({"error": "Maximum 15 scripts per series"}, status_code=400)

    job_id = f"assemble_{uuid.uuid4().hex[:12]}"
    art_style = settings.get("art_style", "cinematic_dark")
    music_id = settings.get("music_id", "none")
    caption_style = settings.get("caption_style", "bold_center")

    # Create a project per segment and queue generation
    segment_projects = []
    for i, script in enumerate(scripts[:15]):
        title = script.get("title", f"Segment {i+1}")
        voice = script.get("voice_id", "nova")
        language = script.get("language", "en")
        script_text = script.get("script_text", "")

        # Create project
        try:
            project = await create_project(user_id, title, niche_id="book", style_id=art_style)
            project_id = project["id"]
            await add_asset(project_id, {
                "type": "script",
                "url": None,
                "prompt": script_text,
                "metadata": json.dumps({
                    "voice": voice,
                    "language": language,
                    "segment_index": i,
                    "music": music_id,
                    "caption_style": caption_style,
                }),
                "status": "ready",
            })
            segment_projects.append({"index": i, "project_id": project_id, "title": title, "voice": voice})
        except Exception:
            segment_projects.append({"index": i, "project_id": None, "title": title, "error": "Failed to create segment project"})

    return {
        "job_id": job_id,
        "status": "queued",
        "total_segments": len(scripts),
        "segment_projects": segment_projects,
        "settings": {
            "art_style": art_style,
            "music_id": music_id,
            "caption_style": caption_style,
        },
        "estimated_minutes": len(scripts) * 2,
        "message": f"Series assembly started. {len(scripts)} segments will be generated and optionally merged.",
    }


@app.post("/videos/{project_id}/publish")
async def publish_video(project_id: str, request: Request):
    """Publish a video to YouTube and/or Instagram.
    
    Body: { user_id, platforms: ["youtube", "instagram"], title, description, hashtags }
    """
    body = await request.json()
    user_id = body.get("user_id", "anonymous")
    platforms = body.get("platforms", ["youtube"])
    title = body.get("title", "")
    description = body.get("description", "")
    hashtags = body.get("hashtags", "")

    project = await get_project(project_id, user_id)
    if not project:
        return JSONResponse({"error": "Project not found"}, status_code=404)

    assets = project.get("assets", {})
    video_url = assets.get("video", {}).get("url") if assets else None

    if not video_url:
        return JSONResponse({"error": "No video asset found. Generate media first."}, status_code=400)

    # Create post jobs for each platform
    jobs = []
    for platform in platforms:
        job = await create_post_job(
            user_id=user_id,
            video_url=video_url,
            title=title or project.get("title", "Faceless Video"),
            description=description,
            hashtags=hashtags,
            platforms=platform,
            project_id=project_id,
        )
        jobs.append(job)

    return {
        "status": "queued",
        "project_id": project_id,
        "platforms": platforms,
        "jobs": jobs,
        "video_url": video_url,
    }


@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Check status of a post job."""
    async with get_db() as db:
        async with db.execute("SELECT * FROM post_jobs WHERE id = ?", (job_id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                return dict(row)
    return JSONResponse({"error": "Job not found"}, status_code=404)


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
