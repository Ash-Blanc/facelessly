import asyncio
import logging
from datetime import datetime
from asgiref.sync import async_to_sync

from faceless.worker import celery_app
from faceless.workflow import DailyVideoWorkflow
from faceless.posting import post_service, create_post_job
from faceless.agents import create_faceless_team
from faceless.database import get_db
from faceless.projects import create_project
from faceless.templates import get_template

logger = logging.getLogger(__name__)

# Re-use the existing workflow logic but wrap in Celery tasks
workflow_engine = DailyVideoWorkflow()

@celery_app.task(name="faceless.tasks.check_pipelines")
def check_pipelines():
    """Periodic task to check for due pipelines and trigger generation."""
    logger.info("Checking for due pipelines...")
    
    async def _check():
        pipelines = await workflow_engine.get_due_pipelines()
        for p in pipelines:
            p_dict = dict(p)
            # Trigger heavy generation task
            generate_video_task.delay(
                pipeline_id=p_dict["id"],
                user_id=p_dict["user_id"],
                niche_id=p_dict["niche"],
                style_id=p_dict["style"],
                template_id=p_dict.get("template", "top5_facts")
            )
            # Update next run time immediately so we don't double-schedule
            await workflow_engine._update_pipeline_run_time(p_dict)
            
    async_to_sync(_check)()

@celery_app.task(name="faceless.tasks.process_posts")
def process_posts():
    """Periodic task to process pending posts."""
    logger.info("Processing pending posts...")
    async_to_sync(post_service.process_pending)()

@celery_app.task(name="faceless.tasks.generate_video", bind=True)
def generate_video_task(self, pipeline_id: str, user_id: str, niche_id: str, style_id: str, template_id: str):
    """Heavy task: Run the agent team to generate a video."""
    logger.info(f"Starting video generation for pipeline {pipeline_id}")
    
    async def _run():
        # Get template for structured prompt
        template = get_template(template_id)
        template_prompt = template.to_prompt() if template else ""

        # Create project for this run
        project = await create_project(
            user_id=user_id,
            title=f"Auto-Gen ({datetime.now().strftime('%Y-%m-%d')})",
            niche_id=niche_id,
            style_id=style_id,
        )

        # Create configured team and run
        # Note regarding blocking calls: Agno Team.run() is synchronous and blocking.
        # Since we are inside a Celery worker, blocking is acceptable as long as concurrency is managed.
        # However, to be safe with asgiref, we should ideally run this in a thread if it's purely blocking IO/CPU.
        # For now, we assume Agno might have some async capabilities or we accept the block.
        team = create_faceless_team(niche_id=niche_id, style_id=style_id)
        prompt = f"Generate a viral faceless short video in the {niche_id} niche.\n\n{template_prompt}"
        
        # Use a sync wrapper or run directly if library supports it
        # Since Team.run is sync, we just call it.
        # But we are in an async def _run()... wait.
        # asgiref.sync.async_to_sync wrapper expects an async function.
        # Inside this async function, we can call sync code, but it blocks the event loop.
        # Celery worker is process/thread based, so blocking one thread is "okay" but efficient.
        try:
             # Run in executor to avoid blocking the event loop if we have other async stuff
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(None, lambda: team.run(prompt))
            result_content = str(response.content) if response else "No content"
        except Exception as e:
            logger.error(f"Agent run failed: {e}")
            result_content = "Generation failed"

        logger.info(f"Generation complete for project {project['id']}")

        # Extract video URL (same logic as workflow.py)
        video_url = workflow_engine._extract_video_url(result_content)

        if video_url:
            # Create post job directly
            await create_post_job(
                user_id=user_id,
                video_url=video_url,
                title=project.get("title", "Faceless Video"),
                description=result_content[:500],
                platforms="youtube", # Default, should come from pipeline parameter if passed
                project_id=project["id"],
            )
            logger.info(f"Post job queued for project {project['id']}")
            
        return {"project_id": project['id'], "status": "completed"}

    return async_to_sync(_run)()
