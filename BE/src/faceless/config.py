"""Niche and style configuration presets for Faceless Video Factory."""

from dataclasses import dataclass, field


@dataclass
class NichePreset:
    """A niche category with tailored agent instructions."""
    id: str
    name: str
    description: str
    emoji: str
    trend_keywords: list[str]
    script_tone: str
    visual_style: str
    voice_preference: str

    def trend_instructions(self) -> list[str]:
        """Extra instructions for the trend scout agent."""
        return [
            f"Focus specifically on the '{self.name}' niche.",
            f"Search for trends related to: {', '.join(self.trend_keywords)}.",
            f"Analyze what makes {self.name} content go viral on short-form platforms.",
        ]

    def script_instructions(self) -> list[str]:
        """Extra instructions for the script writer agent."""
        return [
            f"Write in a {self.script_tone} tone.",
            f"This video targets the '{self.name}' audience.",
            f"Use language and references that resonate with {self.name} viewers.",
        ]

    def visual_instructions(self) -> list[str]:
        """Extra instructions for the video/thumbnail agents."""
        return [
            f"Visual style: {self.visual_style}.",
            f"All visuals should feel authentic to the '{self.name}' niche.",
        ]


@dataclass
class StylePreset:
    """A visual style preset with prompt modifiers."""
    id: str
    name: str
    description: str
    emoji: str
    video_prompt_suffix: str
    image_prompt_suffix: str
    voice: str
    thumbnail_style: str


# === Niche Presets ===

NICHES: dict[str, NichePreset] = {
    "luxury": NichePreset(
        id="luxury",
        name="Luxury & Dark Psychology",
        description="High-end lifestyle, power moves, manipulation tactics",
        emoji="💎",
        trend_keywords=["luxury lifestyle", "dark psychology", "power dynamics", "stoicism", "sigma mindset"],
        script_tone="mysterious, authoritative, thought-provoking",
        visual_style="dark moody cinematic, gold accents, luxury closeups",
        voice_preference="onyx",
    ),
    "space": NichePreset(
        id="space",
        name="Space & Science Facts",
        description="Mind-blowing universe facts, space discoveries",
        emoji="🚀",
        trend_keywords=["space facts", "NASA discoveries", "black holes", "universe mysteries", "astronomy"],
        script_tone="awe-inspiring, educational, mind-blowing",
        visual_style="cosmic, nebula colors, deep space cinematics",
        voice_preference="echo",
    ),
    "reddit": NichePreset(
        id="reddit",
        name="Reddit Stories",
        description="Viral Reddit threads, AITA, relationship drama",
        emoji="📖",
        trend_keywords=["reddit stories", "AITA", "relationship advice", "tifu", "askreddit"],
        script_tone="conversational, dramatic, suspenseful",
        visual_style="cozy ambient backgrounds, subtle motion, gameplay footage",
        voice_preference="nova",
    ),
    "finance": NichePreset(
        id="finance",
        name="Finance & Motivation",
        description="Money mindset, investing, hustle culture",
        emoji="💰",
        trend_keywords=["money mindset", "investing tips", "passive income", "financial freedom", "side hustles"],
        script_tone="energetic, motivational, direct",
        visual_style="modern city skylines, stock charts, sleek dark gradients",
        voice_preference="onyx",
    ),
    "top10": NichePreset(
        id="top10",
        name="Top 10 / Curiosities",
        description="Listicles, bizarre facts, things you didn't know",
        emoji="🔟",
        trend_keywords=["top 10", "things you didn't know", "bizarre facts", "world records", "unsolved mysteries"],
        script_tone="upbeat, curious, rapid-fire",
        visual_style="colorful, dynamic transitions, text-heavy overlays",
        voice_preference="nova",
    ),
    "horror": NichePreset(
        id="horror",
        name="Horror & True Crime",
        description="Creepy stories, unsolved cases, scary facts",
        emoji="👻",
        trend_keywords=["true crime", "horror stories", "unsolved mysteries", "creepypasta", "scary facts"],
        script_tone="eerie, suspenseful, whispery",
        visual_style="dark, foggy, desaturated, horror movie aesthetic",
        voice_preference="echo",
    ),
}


# === Style Presets ===

STYLES: dict[str, StylePreset] = {
    "cinematic_dark": StylePreset(
        id="cinematic_dark",
        name="Cinematic Dark",
        description="Moody, atmospheric, film-noir inspired",
        emoji="🎬",
        video_prompt_suffix="cinematic, dark moody, atmospheric lighting, film noir, high contrast, 4K",
        image_prompt_suffix="cinematic, dark moody, dramatic lighting, high contrast, professional",
        voice="echo",
        thumbnail_style="bold text, dark background, high contrast, dramatic",
    ),
    "bright_energetic": StylePreset(
        id="bright_energetic",
        name="Bright & Energetic",
        description="Vibrant colors, fast-paced, eye-catching",
        emoji="⚡",
        video_prompt_suffix="vibrant colors, energetic, bright, dynamic motion, eye-catching, 4K",
        image_prompt_suffix="vibrant, colorful, energetic, bold, eye-catching, modern",
        voice="nova",
        thumbnail_style="bright colors, bold text, energetic, emoji-style graphics",
    ),
    "minimal_clean": StylePreset(
        id="minimal_clean",
        name="Minimal & Clean",
        description="Simple, modern, whitespace-focused",
        emoji="✨",
        video_prompt_suffix="minimal, clean, modern, soft lighting, elegant, 4K",
        image_prompt_suffix="minimal, clean, lots of whitespace, modern typography, elegant",
        voice="alloy",
        thumbnail_style="clean, minimal text, soft colors, elegant typography",
    ),
    "retro_vintage": StylePreset(
        id="retro_vintage",
        name="Retro / Vintage",
        description="Nostalgic, VHS-style, warm grain",
        emoji="📼",
        video_prompt_suffix="retro, vintage, VHS aesthetic, warm grain, 80s inspired, nostalgic",
        image_prompt_suffix="retro, vintage, film grain, warm tones, nostalgic, analog feel",
        voice="fable",
        thumbnail_style="retro fonts, warm colors, film grain, vintage borders",
    ),
    "neon_futuristic": StylePreset(
        id="neon_futuristic",
        name="Neon Futuristic",
        description="Cyberpunk, glowing neon, futuristic",
        emoji="🌃",
        video_prompt_suffix="neon, cyberpunk, futuristic, glowing lights, sci-fi, purple and blue, 4K",
        image_prompt_suffix="neon glow, cyberpunk, futuristic, electric colors, sci-fi aesthetic",
        voice="shimmer",
        thumbnail_style="neon text effects, dark background, glowing accents, futuristic",
    ),
}


def get_niche(niche_id: str) -> NichePreset | None:
    """Get a niche preset by ID."""
    return NICHES.get(niche_id)


def get_style(style_id: str) -> StylePreset | None:
    """Get a style preset by ID."""
    return STYLES.get(style_id)


def list_niches() -> list[dict]:
    """List all available niches as dicts."""
    return [
        {"id": n.id, "name": n.name, "description": n.description, "emoji": n.emoji}
        for n in NICHES.values()
    ]


def list_styles() -> list[dict]:
    """List all available styles as dicts."""
    return [
        {"id": s.id, "name": s.name, "description": s.description, "emoji": s.emoji}
        for s in STYLES.values()
    ]
