"""Faceless Video Factory - Main entry point."""

import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables before any other imports
load_dotenv()

from agno.os import AgentOS
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .agents import faceless_team
from .auth import get_authorization_url, exchange_code_for_tokens, get_channel_data, save_user
from .database import init_db
from .projects import (
    create_project, get_projects, get_project,
    update_project, delete_project, add_trend, add_asset
)

# Create FastAPI app with custom title/description
app = FastAPI(
    title="Faceless Video Factory API",
    description="Autopilot viral faceless shorts generator",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:7777"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Initialize database on startup."""
    await init_db()


# Auth routes
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
            # Redirect to frontend with auth data
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
            return RedirectResponse(
                f"{frontend_url}/dashboard?user_id={user_id}&channel_name={user_data['channel_name']}"
            )
        return RedirectResponse("/dashboard?error=Failed to get channel data")
    except Exception as e:
        return RedirectResponse(f"/dashboard?error={str(e)}")


# Project routes
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


# Setup AgentOS with the team
agent_os = AgentOS(
    teams=[faceless_team],
    base_app=app,
)

# Get the combined app
app = agent_os.get_app()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 7777))
    uvicorn.run(
        "faceless.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
