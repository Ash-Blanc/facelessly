import os
from celery import Celery
from celery.schedules import crontab

# Default Redis URL
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "faceless",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["faceless.tasks"]
)

# Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    # Worker settings
    worker_prefetch_multiplier=1,  # Agents are heavy/long-running
    worker_concurrency=2,          # Limit concurrent agents to avoid API limits
)

# Scheduled tasks (Beat)
celery_app.conf.beat_schedule = {
    "run-daily-pipeline-check": {
        "task": "faceless.tasks.check_pipelines",
        "schedule": crontab(minute="*/5"),  # Check every 5 mins
    },
    "process-pending-posts": {
        "task": "faceless.tasks.process_posts",
        "schedule": crontab(minute="*/5"),  # Check every 5 mins
    },
}
