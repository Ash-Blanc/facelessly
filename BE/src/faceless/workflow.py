"""Daily video generation workflow for Faceless Video Factory.

Upgraded workflow engine with:
- Pipeline-based scheduling (niche + style + template + platforms)
- Rolling 7-day schedule generation
- Content job → video job → post job pipeline
- Retry handling and failure alerts
"""

import asyncio
import logging
from datetime import datetime, timedelta

from faceless.agents import create_faceless_team
from faceless.database import get_db
from faceless.posting import create_post_job, post_service
from faceless.projects import create_project
from faceless.templates import get_template

logger = logging.getLogger(__name__)


class DailyVideoWorkflow:
    """Background task that generates and posts videos on a schedule."""

    def __init__(self):
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self):
        """Start the daily workflow loop."""
        if self._running:
            logger.info("Workflow already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Daily video workflow started")

    async def stop(self):
        """Stop the daily workflow loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Daily video workflow stopped")

    async def _run_loop(self):
        """Main loop: check schedules, process content jobs, process post jobs."""
        while self._running:
            try:
                # Phase 1: Generate content for due pipelines
                await self._process_pipelines()

                # Phase 2: Process pending post jobs
                await post_service.process_pending()

            except Exception as e:
                logger.error(f"Error in workflow loop: {e}")

            # Check every 5 minutes
            await asyncio.sleep(300)

    # ─── Pipeline Processing ────────────────────────────────────────

    async def get_due_pipelines(self):
        """Get all pipelines that are due for a run."""
        now = datetime.now()
        async with get_db() as db:
            async with db.execute(
                """SELECT * FROM pipelines
                   WHERE enabled = 1
                   AND (next_run_at IS NULL OR next_run_at <= ?)""",
                (now.isoformat(),),
            ) as cursor:
                return await cursor.fetchall()

    async def _process_pipelines(self):
        """Check for pipelines that are due and run them."""
        # LEGACY: This runs in-process. For production, use Celery tasks.
        pipelines = await self.get_due_pipelines()
        
        for pipeline in pipelines:
            p = dict(pipeline)
            try:
                await self._run_pipeline(p)
                await self._update_pipeline_run_time(p)

            except Exception as e:
                logger.error(f"Failed pipeline {p['id']}: {e}")

    async def _update_pipeline_run_time(self, pipeline: dict):
        """Update the last_run_at and next_run_at for a pipeline."""
        now = datetime.now()
        next_run = self._calculate_next_run(pipeline)
        
        async with get_db() as db:
            await db.execute(
                """UPDATE pipelines SET last_run_at = ?, next_run_at = ?,
                   updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                (now.isoformat(), next_run.isoformat(), pipeline["id"]),
            )
        logger.info(f"Pipeline {pipeline['id']} scheduled for next run: {next_run}")

    async def _run_pipeline(self, pipeline: dict):
        """Run a single pipeline: generate content → create video → queue posts."""
        user_id = pipeline["user_id"]
        niche_id = pipeline["niche"]
        style_id = pipeline["style"]
        template_id = pipeline.get("template", "top5_facts")
        platforms = pipeline.get("platforms", "youtube")

        logger.info(
            f"Running pipeline {pipeline['id']}: niche={niche_id}, "
            f"style={style_id}, template={template_id}"
        )

        # Get template for structured prompt
        template = get_template(template_id)
        template_prompt = template.to_prompt() if template else ""

        # Create project for this run
        project = await create_project(
            user_id=user_id,
            title=f"{pipeline.get('name', 'Auto')} ({datetime.now().strftime('%Y-%m-%d')})",
            niche_id=niche_id,
            style_id=style_id,
        )

        # Create configured team and run
        team = create_faceless_team(niche_id=niche_id, style_id=style_id)
        prompt = f"Generate a viral faceless short video in the {niche_id} niche.\n\n{template_prompt}"

        response = team.run(prompt)
        result_content = str(response.content) if response else "No content"

        logger.info(f"Generation complete for project {project['id']}")

        # TODO: Extract video URL from response and download
        # For now, create a post job with the result
        # In production: parse response for video URL → download → upload to S3 → queue post
        video_url = self._extract_video_url(result_content)

        if video_url:
            # Queue post jobs
            auto_approve = pipeline.get("auto_approve", 0)
            if auto_approve:
                await create_post_job(
                    user_id=user_id,
                    video_url=video_url,
                    title=project.get("title", "Faceless Video"),
                    description=result_content[:500],
                    platforms=platforms,
                    project_id=project["id"],
                )
                logger.info(f"Post job queued for project {project['id']}")

        return {"project": project, "result": result_content}

    async def _run_legacy_schedule(self, schedule: dict):
        """Run a legacy schedule (backward compatibility)."""
        user_id = schedule["user_id"]
        niche_id = schedule["niche"]
        style_id = schedule["style"]
        platforms = schedule.get("platforms", "youtube").split(",")

        team = create_faceless_team(niche_id=niche_id, style_id=style_id)
        project = await create_project(
            user_id=user_id,
            title=f"Auto-generated ({datetime.now().strftime('%Y-%m-%d')})",
            niche_id=niche_id,
            style_id=style_id,
        )

        prompt = f"Generate a viral faceless short video in the {niche_id} niche"
        response = team.run(prompt)
        result_content = str(response.content) if response else "No content"

        logger.info(f"Legacy schedule generation complete: {project['id']}")
        return {"project": project, "result": result_content}

    # ─── Helpers ────────────────────────────────────────────────────

    def _calculate_next_run(self, pipeline: dict) -> datetime:
        """Calculate the next run time based on pipeline config."""
        freq = pipeline.get("frequency", "daily")
        now = datetime.now()

        if freq == "daily":
            return now + timedelta(days=1)
        elif freq == "twice_daily":
            return now + timedelta(hours=12)
        elif freq == "weekly":
            return now + timedelta(weeks=1)
        else:
            return now + timedelta(days=1)

    def _extract_video_url(self, content: str) -> str | None:
        """Try to extract a video URL from agent response content."""
        import re
        # Look for pollinations or other video URLs
        patterns = [
            r'https?://[^\s]*pollinations[^\s]*\.mp4[^\s]*',
            r'https?://[^\s]*video[^\s]*\.mp4[^\s]*',
            r'https?://gen\.pollinations\.ai/video/[^\s]*',
        ]
        for pattern in patterns:
            match = re.search(pattern, content)
            if match:
                return match.group(0)
        return None


# ─── Rolling Schedule Generator ────────────────────────────────────────

async def generate_rolling_schedule(pipeline_id: str, days_ahead: int = 7):
    """Generate content jobs for the next N days for a pipeline."""
    async with get_db() as db:
        async with db.execute(
            "SELECT * FROM pipelines WHERE id = ?", (pipeline_id,)
        ) as cursor:
            pipeline = await cursor.fetchone()

        if not pipeline:
            return []

        p = dict(pipeline)
        allowed_days = set(p.get("days_of_week", "mon,tue,wed,thu,fri,sat,sun").split(","))
        day_map = {0: "mon", 1: "tue", 2: "wed", 3: "thu", 4: "fri", 5: "sat", 6: "sun"}

        jobs_created = []
        for i in range(days_ahead):
            target_date = datetime.now() + timedelta(days=i)
            day_name = day_map[target_date.weekday()]

            if day_name not in allowed_days:
                continue

            date_str = target_date.strftime("%Y-%m-%d")

            # Check if job already exists for this date
            async with db.execute(
                "SELECT id FROM content_jobs WHERE pipeline_id = ? AND for_date = ?",
                (pipeline_id, date_str),
            ) as cursor:
                existing = await cursor.fetchone()

            if not existing:
                from faceless.templates import create_content_job
                job = await create_content_job(
                    pipeline_id=pipeline_id,
                    template_id=p.get("template", "top5_facts"),
                    niche_id=p["niche"],
                    style_id=p["style"],
                    for_date=date_str,
                )
                jobs_created.append(job)

        return jobs_created


# Global workflow instance
daily_workflow = DailyVideoWorkflow()