from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "georisk",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.services.tasks.collect_tasks",
        "app.services.tasks.score_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

celery_app.conf.beat_schedule = {
    "collect-gdelt": {
        "task": "app.services.tasks.collect_tasks.collect_gdelt",
        "schedule": settings.GDELT_INTERVAL,
    },
    "collect-newsdata": {
        "task": "app.services.tasks.collect_tasks.collect_newsdata",
        "schedule": settings.NEWSDATA_INTERVAL,
    },
    "collect-rss": {
        "task": "app.services.tasks.collect_tasks.collect_rss",
        "schedule": settings.RSS_INTERVAL,
    },
    "collect-guardian": {
        "task": "app.services.tasks.collect_tasks.collect_guardian",
        "schedule": settings.GUARDIAN_INTERVAL,
    },
    "collect-currents": {
        "task": "app.services.tasks.collect_tasks.collect_currents",
        "schedule": settings.CURRENTS_INTERVAL,
    },
    "collect-gnews": {
        "task": "app.services.tasks.collect_tasks.collect_gnews",
        "schedule": settings.GNEWS_INTERVAL,
    },
    "recompute-indices-scenarios": {
        "task": "app.services.tasks.score_tasks.recompute_all",
        "schedule": settings.RECOMPUTE_INTERVAL,
    },
}
