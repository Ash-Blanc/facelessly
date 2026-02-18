"""Agent definitions for Faceless Video Factory."""

import os

from agno.agent import Agent
from agno.db.sqlite import SqliteDb
from agno.models.mistral import MistralChat
from agno.team import Team
from agno.team.mode import TeamMode
from agno.tools.parallel import ParallelTools
from agno.tools.youtube import YouTubeTools

from faceless.tools import PollinationsTools
from faceless.config import NichePreset, StylePreset, get_niche, get_style, NICHES, STYLES

# === Database ===
db = SqliteDb(
    db_file="faceless_agents.db",
    session_table="agent_sessions",
    memory_table="agent_memories",
    metrics_table="agent_metrics",
)

# === Models ===
mistral_small = MistralChat(id="mistral-small-latest")
mistral_large = MistralChat(id="mistral-large-latest")


def create_trend_scout(niche: NichePreset | None = None) -> Agent:
    """Create a trend scout agent, optionally tailored to a niche."""
    base_instructions = [
        "You are a trend hunter for faceless short-form videos (YouTube Shorts, Reels, TikTok).",
        "Use ParallelTools to search for viral trends and validate engagement metrics.",
        "Use YouTubeTools to analyze trending shorts - study hooks, pacing, topics, viewer retention.",
        "Output exactly 3 ideas in this format:",
        "- Idea 1: [Title/Hook]",
        "  Description: 1-2 sentence summary",
        "  Why viral: engagement potential explanation",
        "  Competitive analysis: what works in this niche",
        "Always cite sources from your research.",
    ]
    if niche:
        base_instructions.extend(niche.trend_instructions())
    else:
        base_instructions.append(
            "Focus on niches: luxury/dark psychology, space facts, Reddit stories, finance motivation, top-10 curiosities."
        )

    return Agent(
        name="ViralTrendScout",
        model=mistral_small,
        instructions=base_instructions,
        tools=[
            ParallelTools(enable_search=True, enable_extract=True),
            YouTubeTools(),
        ],
        db=db,
        add_history_to_context=True,
        add_datetime_to_context=True,
        markdown=True,
        debug_mode=True,
    )


def create_script_writer(niche: NichePreset | None = None) -> Agent:
    """Create a script writer agent, optionally tuned for a niche."""
    base_instructions = [
        "Turn viral ideas into 45-90 second faceless video scripts.",
        "Read the trend research from team memory before writing.",
        "Structure each script as:",
        "1. HOOK (0-3 sec): Ultra-strong opener - question, shocking stat, or bold claim",
        "2. BODY: Storytelling with facts, curiosity loops, use [TEXT: ...] for text-overlay cues",
        "3. END: CTA + cliffhanger or loop tease",
        "Keep energetic, spoken-word style. Max 180-220 words.",
        "Output format:",
        "## Script: [Title]",
        "**Hook:** [0-3 sec hook]",
        "**Body:** [main content with TEXT cues]",
        "**CTA:** [call to action]",
    ]
    if niche:
        base_instructions.extend(niche.script_instructions())

    return Agent(
        name="HookScriptWriter",
        model=mistral_large,
        instructions=base_instructions,
        db=db,
        add_history_to_context=True,
        add_datetime_to_context=True,
        markdown=True,
    )


def create_video_gen(niche: NichePreset | None = None, style: StylePreset | None = None) -> Agent:
    """Create a video generation agent with style configuration."""
    base_instructions = [
        "Generate faceless video clips matching the script content.",
        "Read the script from team memory to understand the visual needs.",
        "Generate 1-3 video clips that match key moments in the script.",
        "Return the video URLs from pollinations.ai.",
        "Output format:",
        "## Generated Videos",
        "- Clip 1: [URL] - [description of scene]",
        "- Clip 2: [URL] - [description of scene]",
    ]
    if niche:
        base_instructions.extend(niche.visual_instructions())
    else:
        base_instructions.append("Style: cinematic, dark moody, atmospheric, no faces visible.")

    if style:
        base_instructions.append(f"Apply this visual style to all generated videos: {style.video_prompt_suffix}")

    return Agent(
        name="VideoGenAgent",
        model=mistral_small,
        instructions=base_instructions,
        tools=[PollinationsTools(enable_video=True, enable_audio=False, enable_image=False)],
        db=db,
        add_history_to_context=True,
        add_datetime_to_context=True,
        markdown=True,
        debug_mode=True,
    )


def create_voiceover(niche: NichePreset | None = None, style: StylePreset | None = None) -> Agent:
    """Create a voiceover agent with voice selection."""
    voice = "nova"
    if style:
        voice = style.voice
    elif niche:
        voice = niche.voice_preference

    base_instructions = [
        "Generate voiceover audio from the script.",
        "Read the script from team memory.",
        f"Use the '{voice}' voice for this video.",
        "Available voices: alloy, echo, fable, onyx, nova, shimmer.",
        "Return the audio URL from pollinations.ai.",
        "Output format:",
        "## Voiceover",
        "**Voice:** [voice name]",
        "**Audio URL:** [url]",
    ]

    return Agent(
        name="VoiceoverAgent",
        model=mistral_small,
        instructions=base_instructions,
        tools=[PollinationsTools(enable_video=False, enable_audio=True, enable_image=False)],
        db=db,
        add_history_to_context=True,
        add_datetime_to_context=True,
        markdown=True,
        debug_mode=True,
    )


def create_thumbnail(niche: NichePreset | None = None, style: StylePreset | None = None) -> Agent:
    """Create a thumbnail agent with style configuration."""
    base_instructions = [
        "Generate eye-catching thumbnails for the video.",
        "Read the script and hook from team memory for context.",
        "Generate 2-3 thumbnail options with different styles.",
        "Return the image URLs from pollinations.ai.",
        "Output format:",
        "## Thumbnails",
        "- Option 1: [URL] - [style description]",
        "- Option 2: [URL] - [style description]",
    ]
    if style:
        base_instructions.append(f"Thumbnail style: {style.thumbnail_style}")
        base_instructions.append(f"Image prompt suffix: {style.image_prompt_suffix}")
    else:
        base_instructions.append("Style: bold, high contrast, click-worthy, space for text overlay.")

    if niche:
        base_instructions.extend(niche.visual_instructions())

    return Agent(
        name="ThumbnailAgent",
        model=mistral_small,
        instructions=base_instructions,
        tools=[PollinationsTools(enable_video=False, enable_audio=False, enable_image=True)],
        db=db,
        add_history_to_context=True,
        add_datetime_to_context=True,
        markdown=True,
        debug_mode=True,
    )


def create_faceless_team(
    niche_id: str | None = None,
    style_id: str | None = None,
) -> Team:
    """Create a faceless video production team configured for a specific niche and style.

    Args:
        niche_id: ID of the niche preset (e.g. 'luxury', 'space', 'reddit').
        style_id: ID of the style preset (e.g. 'cinematic_dark', 'bright_energetic').

    Returns:
        A configured Team ready to produce video content.
    """
    niche = get_niche(niche_id) if niche_id else None
    style = get_style(style_id) if style_id else None

    niche_label = niche.name if niche else "general"
    style_label = style.name if style else "default"

    team_instructions = [
        "You are a fully autonomous faceless video production company.",
        "Goal: Generate 1 complete video package per run.",
        "Pipeline: trends → script → video → voiceover → thumbnail.",
        "Each agent passes output to the next via team memory.",
        "Always optimize for watch time, CTR, retention.",
        f"Content niche: {niche_label}.",
        f"Visual style: {style_label}.",
    ]

    return Team(
        name="FacelessViralFactory",
        members=[
            create_trend_scout(niche),
            create_script_writer(niche),
            create_video_gen(niche, style),
            create_voiceover(niche, style),
            create_thumbnail(niche, style),
        ],
        mode=TeamMode.coordinate,
        instructions=team_instructions,
        db=db,
        enable_agentic_memory=True,
        add_history_to_context=True,
        add_datetime_to_context=True,
        markdown=True,
        show_members_responses=True,
    )


# === Default team (lazy-loaded to avoid crashing if API keys aren't set) ===
_default_team: Team | None = None


def get_default_team() -> Team:
    """Get or create the default faceless team."""
    global _default_team
    if _default_team is None:
        _default_team = create_faceless_team()
    return _default_team


# For backward compatibility (used by AgentOS in main.py)
# This is a property-like access; main.py should use get_default_team() instead
try:
    faceless_team = create_faceless_team()
except Exception:
    # If API keys aren't set, create a minimal placeholder
    faceless_team = Team(
        name="FacelessViralFactory",
        members=[],
        mode=TeamMode.coordinate,
        instructions=["API keys not configured. Set PARALLEL_API_KEY and MISTRAL_API_KEY in .env"],
        db=db,
    )
