"""Agent definitions for Faceless Video Factory."""

import os

from agno.agent import Agent
from agno.db.sqlite import SqliteDb
from agno.models.mistral import MistralChat
from agno.team import Team
from agno.team.mode import TeamMode
from agno.tools.parallel import ParallelTools
from agno.tools.youtube import YouTubeTools

from .tools import PollinationsTools

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

# === Agents ===

trend_scout = Agent(
    name="ViralTrendScout",
    model=mistral_small,
    instructions=[
        "You are a trend hunter for faceless short-form videos (YouTube Shorts, Reels, TikTok).",
        "Use ParallelTools to search for viral trends and validate engagement metrics.",
        "Use YouTubeTools to analyze trending shorts - study hooks, pacing, topics, viewer retention.",
        "Focus on niches: luxury/dark psychology, space facts, Reddit stories, finance motivation, top-10 curiosities.",
        "Output exactly 3 ideas in this format:",
        "- Idea 1: [Title/Hook]",
        "  Description: 1-2 sentence summary",
        "  Why viral: engagement potential explanation",
        "  Competitive analysis: what works in this niche",
        "Always cite sources from your research.",
    ],
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

script_writer = Agent(
    name="HookScriptWriter",
    model=mistral_large,
    instructions=[
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
    ],
    db=db,
    add_history_to_context=True,
    add_datetime_to_context=True,
    markdown=True,
)

video_gen = Agent(
    name="VideoGenAgent",
    model=mistral_small,
    instructions=[
        "Generate faceless video clips matching the script content.",
        "Style: cinematic, dark moody, atmospheric, no faces visible.",
        "Read the script from team memory to understand the visual needs.",
        "Generate 1-3 video clips that match key moments in the script.",
        "Return the video URLs from pollinations.ai.",
        "Output format:",
        "## Generated Videos",
        "- Clip 1: [URL] - [description of scene]",
        "- Clip 2: [URL] - [description of scene]",
    ],
    tools=[PollinationsTools(enable_video=True, enable_audio=False, enable_image=False)],
    db=db,
    add_history_to_context=True,
    add_datetime_to_context=True,
    markdown=True,
    debug_mode=True,
)

voiceover = Agent(
    name="VoiceoverAgent",
    model=mistral_small,
    instructions=[
        "Generate voiceover audio from the script.",
        "Read the script from team memory.",
        "Select voice based on content style:",
        "- nova: energetic, upbeat",
        "- echo: mysterious, dramatic",
        "- onyx: deep, authoritative",
        "Return the audio URL from pollinations.ai.",
        "Output format:",
        "## Voiceover",
        "**Voice:** [voice name]",
        "**Audio URL:** [url]",
    ],
    tools=[PollinationsTools(enable_video=False, enable_audio=True, enable_image=False)],
    db=db,
    add_history_to_context=True,
    add_datetime_to_context=True,
    markdown=True,
    debug_mode=True,
)

thumbnail = Agent(
    name="ThumbnailAgent",
    model=mistral_small,
    instructions=[
        "Generate eye-catching thumbnails for the video.",
        "Style: bold, high contrast, click-worthy, space for text overlay.",
        "Read the script and hook from team memory for context.",
        "Generate 2-3 thumbnail options with different styles.",
        "Return the image URLs from pollinations.ai.",
        "Output format:",
        "## Thumbnails",
        "- Option 1: [URL] - [style description]",
        "- Option 2: [URL] - [style description]",
    ],
    tools=[PollinationsTools(enable_video=False, enable_audio=False, enable_image=True)],
    db=db,
    add_history_to_context=True,
    add_datetime_to_context=True,
    markdown=True,
    debug_mode=True,
)

# === Team ===

faceless_team = Team(
    name="FacelessViralFactory",
    members=[trend_scout, script_writer, video_gen, voiceover, thumbnail],
    mode=TeamMode.coordinate,
    instructions=[
        "You are a fully autonomous faceless video production company.",
        "Goal: Generate 1 complete video package per run.",
        "Pipeline: trends → script → video → voiceover → thumbnail.",
        "Each agent passes output to the next via team memory.",
        "Always optimize for watch time, CTR, retention.",
    ],
    db=db,
    enable_agentic_memory=True,
    add_history_to_context=True,
    add_datetime_to_context=True,
    markdown=True,
    show_members_responses=True,
)
