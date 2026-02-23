# Faceless Video Factory: Mistral + Pollinations Integration Design

**Date:** 2026-02-17
**Status:** ✅ Implemented (2026-02-18)

## Overview

Integrate Mistral AI for LLM reasoning, Pollinations.ai for media generation (video/audio/image), ParallelTools for trend research, and YouTubeTools for competitive analysis. Create a full automated pipeline from trend discovery to thumbnail generation.

## Architecture

### Agent Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    FacelessViralFactory Team                     │
│                      (collaborative mode)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ViralTrendScout                                              │
│     Model: MistralChat("mistral-small-latest")                   │
│     Tools: ParallelTools, YouTubeTools                           │
│     Output: 3 viral ideas with niche analysis                    │
│                                                                  │
│  2. HookScriptWriter                                             │
│     Model: MistralChat("mistral-large-latest")                   │
│     Tools: none (pure reasoning)                                 │
│     Output: 45-90 second script with hook/body/CTA               │
│                                                                  │
│  3. VideoGenAgent                                                │
│     Model: MistralChat("mistral-small-latest")                   │
│     Tools: PollinationsVideoTool (custom)                        │
│     Output: Video clip URL from pollinations.ai                  │
│                                                                  │
│  4. VoiceoverAgent                                               │
│     Model: MistralChat("mistral-small-latest")                   │
│     Tools: PollinationsAudioTool (custom)                        │
│     Output: TTS audio URL from pollinations.ai                   │
│                                                                  │
│  5. ThumbnailAgent                                               │
│     Model: MistralChat("mistral-small-latest")                   │
│     Tools: PollinationsImageTool (custom)                        │
│     Output: Thumbnail image URL from pollinations.ai             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Team Memory Flow

The team uses `enable_agentic_memory=True` so each agent sees outputs from previous agents:
- Script writer sees trend research from ViralTrendScout
- VideoGenAgent sees the script
- VoiceoverAgent sees the script
- ThumbnailAgent sees script and hook

## Tools

### Custom Pollinations Toolkit

A `PollinationsTools` class in `BE/src/faceless/tools.py` that bundles video, audio, and image generation using the `gen.pollinations.ai` unified API.

```python
class PollinationsTools(Toolkit):
    def __init__(
        self,
        enable_video: bool = True,
        enable_audio: bool = True,
        enable_image: bool = True,
        api_key: str | None = None,
    ):
        ...

    def generate_video(self, prompt: str, duration: int = 5) -> str:
        """Generate a short video clip from a text prompt."""

    def generate_audio(self, text: str, voice: str = "nova") -> str:
        """Generate text-to-speech audio."""

    def generate_image(self, prompt: str, style: str = "cinematic") -> str:
        """Generate an image from a text prompt."""
```

### Built-in Agno Tools

| Tool | Import | Use Case |
|------|--------|----------|
| ParallelTools | `from agno.tools.parallel import ParallelTools` | AI-optimized web search & extraction for trend research |
| YouTubeTools | `from agno.tools.youtube import YouTubeTools` | Get captions, metadata, timestamps for competitive analysis |

## Agent Definitions

### ViralTrendScout
- **Model:** `mistral-small-latest`
- **Tools:** ParallelTools (search + extract), YouTubeTools
- **Instructions:** Hunt trends, validate engagement, analyze competitor shorts, focus on key niches
- **Output:** 3 viral ideas with title/hook, description, why viral, competitive analysis

### HookScriptWriter
- **Model:** `mistral-large-latest`
- **Tools:** None (pure reasoning from team memory)
- **Instructions:** Convert ideas to 45-90s scripts with hook/body/CTA structure, include text-overlay markers
- **Output:** Script with max 180-220 words

### VideoGenAgent
- **Model:** `mistral-small-latest`
- **Tools:** PollinationsTools (video only)
- **Instructions:** Generate cinematic, dark moody, faceless video clips from script
- **Output:** Video URL from pollinations.ai

### VoiceoverAgent
- **Model:** `mistral-small-latest`
- **Tools:** PollinationsTools (audio only)
- **Instructions:** Generate voiceover from script, select appropriate voice style
- **Output:** Audio URL from pollinations.ai

### ThumbnailAgent
- **Model:** `mistral-small-latest`
- **Tools:** PollinationsTools (image only)
- **Instructions:** Generate bold, high-contrast, click-worthy thumbnails
- **Output:** Image URL from pollinations.ai

## Configuration

### Environment Variables

```bash
# BE/.env

# Required - Mistral AI
MISTRAL_API_KEY=your_mistral_api_key

# Required - Parallel (for trend research)
PARALLEL_API_KEY=your_parallel_api_key

# Optional - Pollinations (enhanced rate limits)
POLLINATIONS_API_KEY=optional_key_here

# Server
PORT=8000
```

### Dependencies

```toml
# BE/pyproject.toml

dependencies = [
    "agno[tools,mistral]",
    "httpx",
]
```

## Files Modified

| File | Changes | Status |
|------|---------|--------|
| `BE/src/faceless/agents.py` | Replaced OpenAI with Mistral, added 5 agents, factory function with niche/style | ✅ Done |
| `BE/src/faceless/tools.py` | Added PollinationsTools class (video/audio/image) | ✅ Done |
| `BE/src/faceless/config.py` | **[NEW]** Niche presets (6) and style presets (5) | ✅ Done |
| `BE/pyproject.toml` | Updated dependencies | ✅ Done |
| `BE/.env.example` | Added new environment variables | ✅ Done |

## API Endpoints

AgentOS endpoints (auto-generated):
- `GET /teams` - Lists FacelessViralFactory team
- `POST /teams/faceless_viral_factory/runs` - Run the full pipeline with streaming

New custom endpoints added:
- `GET /niches` - List niche presets
- `GET /styles` - List style presets
- `POST /generate` - Run AI pipeline with niche/style config
- `POST /schedule` - Create/update daily auto-posting schedule
- `GET /schedule/{user_id}` - Get user's schedule
- `DELETE /schedule/{user_id}` - Remove schedule

## Success Criteria

- [x] Team runs end-to-end: trend → script → video → audio → thumbnail
- [x] All outputs are URLs from pollinations.ai or structured markdown
- [x] Mistral models handle all reasoning (no OpenAI dependency)
- [x] Frontend can stream the full pipeline execution
- [x] Niche/style system customizes agent instructions
- [x] Factory function creates configured teams on demand
