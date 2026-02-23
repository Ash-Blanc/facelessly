"""Content templates for structured video script generation.

Built-in templates for common faceless video formats.
Each template defines a structure that the LLM uses to generate scripts.
"""

import uuid
from dataclasses import dataclass, field
from typing import Any

from faceless.database import get_db


@dataclass
class ContentTemplate:
    """A reusable video content template."""
    id: str
    name: str
    description: str
    emoji: str
    structure: dict[str, Any]
    example_script: str
    niche_tags: list[str] = field(default_factory=list)

    def to_prompt(self) -> str:
        """Convert template structure to an LLM prompt instruction."""
        sections = self.structure.get("sections", [])
        prompt_parts = [f"Create a video script using the '{self.name}' format."]
        prompt_parts.append(f"Structure: {self.structure.get('format', 'list')}")
        prompt_parts.append(f"Target duration: {self.structure.get('duration', '30-60')} seconds")
        prompt_parts.append("")
        prompt_parts.append("Sections:")

        for i, section in enumerate(sections, 1):
            duration = section.get("duration", "")
            prompt_parts.append(
                f"  {i}. {section['name']} ({duration}): {section.get('instruction', '')}"
            )

        return "\n".join(prompt_parts)


# ─── Built-in Templates ───────────────────────────────────────────────────

TEMPLATES: dict[str, ContentTemplate] = {
    "top5_facts": ContentTemplate(
        id="top5_facts",
        name="Top 5 Facts",
        description="Numbered list of surprising facts with a hook opener",
        emoji="🔢",
        structure={
            "format": "numbered_list",
            "duration": "45-60",
            "sections": [
                {"name": "Hook", "duration": "0-3s", "instruction": "Shocking question or bold claim to stop scrolling"},
                {"name": "Fact 1", "duration": "5-8s", "instruction": "Most surprising fact, builds curiosity"},
                {"name": "Fact 2", "duration": "5-8s", "instruction": "Counter-intuitive or mind-blowing fact"},
                {"name": "Fact 3", "duration": "5-8s", "instruction": "Emotional or relatable fact"},
                {"name": "Fact 4", "duration": "5-8s", "instruction": "Niche-specific deep cut"},
                {"name": "Fact 5", "duration": "5-8s", "instruction": "Grand finale — most impressive fact"},
                {"name": "CTA", "duration": "3-5s", "instruction": "Follow for more + tease next video"},
            ],
        },
        example_script=(
            "HOOK: Did you know there's a lake that turns animals into stone?\n\n"
            "#1: Lake Natron in Tanzania has a pH of 10.5...\n"
            "#2: The human body contains enough iron to make a 3-inch nail...\n"
            "#3: Honey never spoils — 3000-year-old jars found in Egyptian tombs...\n"
            "#4: Octopuses have three hearts and blue blood...\n"
            "#5: There are more stars in the universe than grains of sand on Earth...\n\n"
            "CTA: Follow for daily mind-blowing facts. Drop a 🤯 if this surprised you!"
        ),
        niche_tags=["top10", "space", "horror"],
    ),

    "myth_vs_fact": ContentTemplate(
        id="myth_vs_fact",
        name="Myth vs Fact",
        description="Debunks common misconceptions with dramatic reveals",
        emoji="❌✅",
        structure={
            "format": "comparison",
            "duration": "30-45",
            "sections": [
                {"name": "Hook", "duration": "0-3s", "instruction": "Start with the most believed myth"},
                {"name": "Myth 1", "duration": "4-6s", "instruction": "State the myth dramatically"},
                {"name": "Fact 1", "duration": "4-6s", "instruction": "Reveal the truth with evidence"},
                {"name": "Myth 2", "duration": "4-6s", "instruction": "Another surprising misconception"},
                {"name": "Fact 2", "duration": "4-6s", "instruction": "Real answer backed by science/data"},
                {"name": "Myth 3", "duration": "4-6s", "instruction": "Final myth for maximum impact"},
                {"name": "Fact 3", "duration": "4-6s", "instruction": "Mind-blowing truth"},
                {"name": "CTA", "duration": "3s", "instruction": "Which one shocked you? Comment! Follow for more."},
            ],
        },
        example_script=(
            "HOOK: Everything you know about sugar is WRONG.\n\n"
            "MYTH: Sugar makes kids hyperactive.\n"
            "FACT: Multiple studies show zero connection. It's parent expectations.\n\n"
            "MYTH: We only use 10% of our brain.\n"
            "FACT: fMRI scans show nearly all brain regions are active daily.\n\n"
            "MYTH: Cracking knuckles causes arthritis.\n"
            "FACT: A doctor cracked his left hand's knuckles for 60 years — no difference.\n\n"
            "CTA: Which myth did you believe? Tell me in the comments!"
        ),
        niche_tags=["top10", "space", "finance"],
    ),

    "tips_for": ContentTemplate(
        id="tips_for",
        name="X Tips for Y",
        description="Actionable advice in a quick, value-packed format",
        emoji="💡",
        structure={
            "format": "tips_list",
            "duration": "45-60",
            "sections": [
                {"name": "Hook", "duration": "0-3s", "instruction": "Promise of value: 'X tips that will change your Y'"},
                {"name": "Tip 1", "duration": "8-10s", "instruction": "Quick win — easy to implement, instant gratification"},
                {"name": "Tip 2", "duration": "8-10s", "instruction": "Strategy tip — slightly deeper insight"},
                {"name": "Tip 3", "duration": "8-10s", "instruction": "Pro tip — insider knowledge most don't know"},
                {"name": "Bonus", "duration": "8-10s", "instruction": "Unexpected bonus tip for extra value"},
                {"name": "CTA", "duration": "3-5s", "instruction": "Save this video + follow for more tips"},
            ],
        },
        example_script=(
            "HOOK: 5 money habits that separate the rich from the broke.\n\n"
            "TIP 1: Pay yourself first. Before any bills, move 20% to savings.\n"
            "TIP 2: Use the 48-hour rule. Wait 48 hours before any purchase over $50.\n"
            "TIP 3: Automate everything. Set up auto-invest on payday.\n"
            "BONUS: Track every dollar for 30 days. You'll be shocked where your money goes.\n\n"
            "CTA: Save this and start today. Follow for daily money tips."
        ),
        niche_tags=["finance", "luxury"],
    ),

    "daily_quote": ContentTemplate(
        id="daily_quote",
        name="Daily Quote",
        description="Inspirational quote with deep explanation and visual backdrop",
        emoji="💬",
        structure={
            "format": "quote_analysis",
            "duration": "30-45",
            "sections": [
                {"name": "Quote", "duration": "5-7s", "instruction": "Display the quote with dramatic pause"},
                {"name": "Context", "duration": "8-10s", "instruction": "Who said it and why it matters today"},
                {"name": "Deep Dive", "duration": "10-15s", "instruction": "Explain the hidden meaning most people miss"},
                {"name": "Application", "duration": "5-8s", "instruction": "How to apply this to your life right now"},
                {"name": "CTA", "duration": "3s", "instruction": "Follow for daily wisdom"},
            ],
        },
        example_script=(
            "QUOTE: 'The enemy of the modern man is not oppression. It is distraction.'\n\n"
            "CONTEXT: This comes from Stoic philosophy, echoed by thinkers from Marcus Aurelius to Cal Newport.\n\n"
            "DEEP DIVE: We live in the most distracted era in human history. "
            "Your phone gets 80+ notifications a day. Each one steals 23 minutes of focus.\n\n"
            "APPLICATION: Delete one app today. Just one. Watch what happens to your productivity.\n\n"
            "CTA: Follow for daily quotes that actually make you think."
        ),
        niche_tags=["luxury", "finance", "reddit"],
    ),

    "story_time": ContentTemplate(
        id="story_time",
        name="Story Time",
        description="Narrative-driven format for Reddit stories, true crime, scary tales",
        emoji="📖",
        structure={
            "format": "narrative",
            "duration": "45-90",
            "sections": [
                {"name": "Hook", "duration": "0-3s", "instruction": "Irresistible cliffhanger opening — 'This man did X and nobody expected Y'"},
                {"name": "Setup", "duration": "10-15s", "instruction": "Set the scene, introduce characters, build tension"},
                {"name": "Conflict", "duration": "15-25s", "instruction": "The main event — drama, twist, or shocking revelation"},
                {"name": "Resolution", "duration": "8-12s", "instruction": "Outcome or twist ending"},
                {"name": "Reaction", "duration": "3-5s", "instruction": "Ask viewers: 'What would you have done?' + follow CTA"},
            ],
        },
        example_script=(
            "HOOK: This woman discovered her husband had a secret family for 12 years.\n\n"
            "SETUP: Sarah thought she had the perfect marriage. Two kids, a house in the suburbs...\n\n"
            "CONFLICT: One day she found a second phone in his jacket. 847 messages. "
            "Another woman. Another address. Two more children.\n\n"
            "RESOLUTION: She hired a PI, documented everything, and walked into his 'work meeting' "
            "with both families present.\n\n"
            "REACTION: What would you have done? Tell me in the comments."
        ),
        niche_tags=["reddit", "horror"],
    ),

    "did_you_know": ContentTemplate(
        id="did_you_know",
        name="Did You Know?",
        description="Single deep-dive fact with visual exploration",
        emoji="🧠",
        structure={
            "format": "deep_dive",
            "duration": "30-45",
            "sections": [
                {"name": "Question", "duration": "3-5s", "instruction": "Ask a fascinating question that demands an answer"},
                {"name": "Answer", "duration": "5-8s", "instruction": "Reveal the answer in a surprising way"},
                {"name": "Explanation", "duration": "10-15s", "instruction": "Break down the science/history behind it"},
                {"name": "Mind-Blow", "duration": "5-8s", "instruction": "Add a bonus fact that makes it even crazier"},
                {"name": "CTA", "duration": "3s", "instruction": "Follow for more — ask people to share with someone"},
            ],
        },
        example_script=(
            "QUESTION: What happens to your body in space without a suit?\n\n"
            "ANSWER: You don't explode. You actually have about 15 seconds of consciousness.\n\n"
            "EXPLANATION: Your blood doesn't boil immediately — your skin holds it in. "
            "But water on your tongue and in your lungs vaporizes. "
            "You'd swell to twice your size from gas expansion.\n\n"
            "MIND-BLOW: NASA knows this because a technician was accidentally exposed to near-vacuum in 1966. He survived.\n\n"
            "CTA: Send this to someone who'd freak out. Follow for daily space facts."
        ),
        niche_tags=["space", "top10"],
    ),
}


def get_template(template_id: str) -> ContentTemplate | None:
    """Get a content template by ID."""
    return TEMPLATES.get(template_id)


def list_templates(niche_id: str | None = None) -> list[dict]:
    """List available templates, optionally filtered by niche."""
    templates = []
    for t in TEMPLATES.values():
        if niche_id and niche_id not in t.niche_tags:
            continue
        templates.append({
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "emoji": t.emoji,
            "niche_tags": t.niche_tags,
            "duration": t.structure.get("duration", "30-60"),
        })
    return templates


# ─── Content Job Helpers ───────────────────────────────────────────────────

async def create_content_job(
    pipeline_id: str,
    template_id: str,
    niche_id: str,
    style_id: str,
    for_date: str,
) -> dict[str, Any]:
    """Create a content job for scheduled generation."""
    job_id = f"content_{uuid.uuid4().hex[:12]}"

    async with get_db() as db:
        await db.execute(
            """INSERT INTO content_jobs
               (id, pipeline_id, template_id, niche_id, style_id, for_date, status)
               VALUES (?, ?, ?, ?, ?, ?, 'pending')""",
            (job_id, pipeline_id, template_id, niche_id, style_id, for_date),
        )

    return {"id": job_id, "status": "pending", "for_date": for_date}


async def get_content_jobs(pipeline_id: str, limit: int = 30) -> list[dict[str, Any]]:
    """Get content jobs for a pipeline."""
    async with get_db() as db:
        async with db.execute(
            """SELECT * FROM content_jobs WHERE pipeline_id = ?
               ORDER BY for_date DESC LIMIT ?""",
            (pipeline_id, limit),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
