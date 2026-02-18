# Mistral + Pollinations Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace OpenAI with Mistral AI, integrate Pollinations.ai for media generation, and add ParallelTools + YouTubeTools for research.

**Architecture:** 5-agent collaborative team pipeline: trend_scout → script_writer → video_gen → voiceover → thumbnail. Each agent passes output via team memory. Custom PollinationsTools class wraps the gen.pollinations.ai API.

**Tech Stack:** Agno, Mistral AI, Pollinations.ai, ParallelTools, YouTubeTools, httpx

---

## Task 1: Update Dependencies

**Files:**
- Modify: `BE/pyproject.toml`
- Modify: `BE/.env.example`

**Step 1: Update pyproject.toml dependencies**

Open `BE/pyproject.toml` and update the dependencies section:

```toml
dependencies = [
    "agno[tools,mistral]",
    "httpx",
    "python-dotenv",
    "uvicorn",
]
```

**Step 2: Sync dependencies**

Run: `cd BE && uv sync`
Expected: Dependencies installed successfully

**Step 3: Create .env.example with new variables**

Create `BE/.env.example`:

```bash
# Required - Mistral AI
MISTRAL_API_KEY=your_mistral_api_key

# Required - Parallel (for trend research)
PARALLEL_API_KEY=your_parallel_api_key

# Optional - Pollinations (enhanced rate limits)
POLLINATIONS_API_KEY=optional_key_here

# Server
PORT=8000
```

**Step 4: Commit**

```bash
git add BE/pyproject.toml BE/.env.example
git commit -m "chore: update dependencies for Mistral + Pollinations integration"
```

---

## Task 2: Implement PollinationsTools Class

**Files:**
- Modify: `BE/src/faceless/tools.py`

**Step 1: Rewrite tools.py with PollinationsTools class**

Replace entire contents of `BE/src/faceless/tools.py`:

```python
"""Custom tools for Faceless Video Factory agents."""

import os
from urllib.parse import quote

import httpx
from agno.tools import Toolkit


class PollinationsTools(Toolkit):
    """Toolkit for generating media via pollinations.ai API."""

    def __init__(
        self,
        enable_video: bool = True,
        enable_audio: bool = True,
        enable_image: bool = True,
        api_key: str | None = None,
    ):
        self.api_key = api_key or os.getenv("POLLINATIONS_API_KEY")
        self.base_url = "https://gen.pollinations.ai"

        tools = []
        if enable_video:
            tools.append(self.generate_video)
        if enable_audio:
            tools.append(self.generate_audio)
        if enable_image:
            tools.append(self.generate_image)

        super().__init__(name="pollinations", tools=tools)

    def generate_video(
        self,
        prompt: str,
        duration: int = 5,
        model: str = "seedance",
    ) -> str:
        """Generate a short video clip from a text prompt.

        Args:
            prompt: Description of the video to generate.
            duration: Approximate duration in seconds (default: 5).
            model: Video model to use (default: seedance).

        Returns:
            URL to the generated video.
        """
        encoded_prompt = quote(prompt)
        url = f"{self.base_url}/video/{encoded_prompt}"

        # Pollinations returns the video directly at this URL
        # Add model and duration as query params for future compatibility
        params = {"model": model}
        if self.api_key:
            params["key"] = self.api_key

        # Make request to trigger generation and get result URL
        response = httpx.get(url, params=params, timeout=120.0)

        if response.status_code == 200:
            # The response is the video content or redirect URL
            return str(response.url)
        else:
            return f"Error generating video: {response.status_code}"

    def generate_audio(
        self,
        text: str,
        voice: str = "nova",
    ) -> str:
        """Generate text-to-speech audio from text.

        Args:
            text: The text to convert to speech.
            voice: Voice to use (alloy, echo, fable, onyx, nova, shimmer).

        Returns:
            URL to the generated audio file.
        """
        encoded_text = quote(text)
        url = f"{self.base_url}/audio/{encoded_text}"

        params = {"voice": voice}
        if self.api_key:
            params["key"] = self.api_key

        response = httpx.get(url, params=params, timeout=60.0)

        if response.status_code == 200:
            return str(response.url)
        else:
            return f"Error generating audio: {response.status_code}"

    def generate_image(
        self,
        prompt: str,
        style: str = "cinematic",
        model: str = "flux",
    ) -> str:
        """Generate an image from a text prompt.

        Args:
            prompt: Description of the image to generate.
            style: Style modifier (appended to prompt).
            model: Image model to use (flux, gpt-image, etc.).

        Returns:
            URL to the generated image.
        """
        full_prompt = f"{prompt}, {style}"
        encoded_prompt = quote(full_prompt)
        url = f"{self.base_url}/image/{encoded_prompt}"

        params = {"model": model}
        if self.api_key:
            params["key"] = self.api_key

        response = httpx.get(url, params=params, timeout=60.0)

        if response.status_code == 200:
            return str(response.url)
        else:
            return f"Error generating image: {response.status_code}"


__all__ = ["PollinationsTools"]
```

**Step 2: Verify syntax**

Run: `cd BE && uv run python -c "from faceless.tools import PollinationsTools; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add BE/src/faceless/tools.py
git commit -m "feat: add PollinationsTools class for video/audio/image generation"
```

---

## Task 3: Update Agents with Mistral and New Tools

**Files:**
- Modify: `BE/src/faceless/agents.py`

**Step 1: Rewrite agents.py with full pipeline**

Replace entire contents of `BE/src/faceless/agents.py`:

```python
"""Agent definitions for Faceless Video Factory."""

from agno.agent import Agent
from agno.models.mistral import MistralChat
from agno.team import Team
from agno.tools.parallel import ParallelTools
from agno.tools.youtube import YouTubeTools

from .tools import PollinationsTools

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
    markdown=True,
    show_tool_calls=True,
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
    markdown=True,
    show_tool_calls=True,
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
    markdown=True,
    show_tool_calls=True,
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
    markdown=True,
    show_tool_calls=True,
)

# === Team ===

faceless_team = Team(
    name="FacelessViralFactory",
    agents=[trend_scout, script_writer, video_gen, voiceover, thumbnail],
    mode="collaborative",
    instructions=[
        "You are a fully autonomous faceless video production company.",
        "Goal: Generate 1 complete video package per run.",
        "Pipeline: trends → script → video → voiceover → thumbnail.",
        "Each agent passes output to the next via team memory.",
        "Always optimize for watch time, CTR, retention.",
    ],
    enable_agentic_memory=True,
    markdown=True,
    show_tool_calls=True,
)
```

**Step 2: Verify imports work**

Run: `cd BE && uv run python -c "from faceless.agents import faceless_team; print(f'Team: {faceless_team.name}, Agents: {len(faceless_team.agents)}')"`
Expected: `Team: FacelessViralFactory, Agents: 5`

**Step 3: Commit**

```bash
git add BE/src/faceless/agents.py
git commit -m "feat: replace OpenAI with Mistral, add video/voiceover/thumbnail agents"
```

---

## Task 4: Update main.py Imports

**Files:**
- Modify: `BE/src/faceless/main.py`

**Step 1: Verify main.py is correct**

The current `main.py` already imports from `.agents import faceless_team`, so no changes needed. Verify it works:

Run: `cd BE && uv run python -c "from faceless.main import app; print('App created:', app.title)"`
Expected: `App created: Faceless Video Factory API`

**Step 2: Commit (if no changes needed, skip)**

No changes needed - move to next task.

---

## Task 5: Integration Test

**Files:**
- None (manual test)

**Step 1: Start the server**

Run: `cd BE && uv run src/faceless/main.py`
Expected: Server starts on http://localhost:8000

**Step 2: Verify API docs**

Open: http://localhost:8000/docs
Expected: FastAPI Swagger UI shows Faceless Video Factory API endpoints

**Step 3: Test team endpoint**

Run in another terminal:
```bash
curl http://localhost:8000/teams
```
Expected: JSON with `FacelessViralFactory` team listed

**Step 4: Test health endpoint**

```bash
curl http://localhost:8000/health
```
Expected: `{"status": "ok"}` or similar

---

## Task 6: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update environment variables section**

In `CLAUDE.md`, update the Environment Variables section:

```markdown
### Environment Variables

**Backend (BE/.env):**
- `MISTRAL_API_KEY` - Required for Mistral AI models
- `PARALLEL_API_KEY` - Required for ParallelTools trend research
- `POLLINATIONS_API_KEY` - Optional, for enhanced rate limits
- `PORT` - Server port (default: 8000)

**Frontend (FE/.env.local):**
- `NEXT_PUBLIC_OS_SECURITY_KEY` - Optional auth token for AgentOS
```

**Step 2: Update tech stack section**

```markdown
## Tech Stack

**Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Framer Motion, nuqs (URL state)

**Backend:** Python 3.13, Agno/AgentOS, FastAPI, uvicorn, Mistral AI models, Pollinations.ai (media), ParallelTools (research), YouTubeTools (analysis)

**Package Managers:** pnpm (FE), uv (BE)
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with new integrations"
```

---

## Task 7: Final Commit and Verification

**Step 1: Run full verification**

```bash
cd BE && uv run python -c "
from faceless.agents import faceless_team
from faceless.tools import PollinationsTools
from faceless.main import app

print('=== Verification ===')
print(f'Team: {faceless_team.name}')
print(f'Agents: {[a.name for a in faceless_team.agents]}')
print(f'Tools: {PollinationsTools().__class__.__name__}')
print(f'App: {app.title}')
print('=== All checks passed ===')
"
```
Expected: All checks passed output

**Step 2: Final commit**

```bash
git add -A
git commit -m "feat: complete Mistral + Pollinations integration

- Replace OpenAI with Mistral AI (small for tasks, large for script writing)
- Add PollinationsTools for video/audio/image generation
- Integrate ParallelTools for AI-optimized trend research
- Integrate YouTubeTools for competitive analysis
- Add VideoGenAgent, VoiceoverAgent, ThumbnailAgent to pipeline
- Update documentation and environment config"
```

---

## Success Criteria

- [ ] `uv sync` completes without errors
- [ ] All imports resolve correctly
- [ ] Server starts on port 8000
- [ ] `/teams` endpoint returns FacelessViralFactory with 5 agents
- [ ] `/docs` shows FastAPI Swagger UI
- [ ] Team has: ViralTrendScout, HookScriptWriter, VideoGenAgent, VoiceoverAgent, ThumbnailAgent
