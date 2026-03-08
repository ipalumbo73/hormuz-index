"""Collection tasks - fetch data from sources and persist to DB."""
import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.services.tasks.celery_app import celery_app
from app.services.ingestion.gdelt_client import GDELTClient
from app.services.ingestion.newsdata_client import NewsDataClient
from app.services.ingestion.rss_client import RSSClient
from app.services.ingestion.guardian_client import GuardianClient
from app.services.ingestion.currents_client import CurrentsClient
from app.services.ingestion.gnews_client import GNewsClient
from app.services.parsing.normalizer import normalize_article
from app.services.parsing.entity_extractor import extract_entities
from app.services.parsing.classifier import classify_event
from app.services.dedupe.fingerprint import compute_fingerprint, time_bucket
from app.core.config import settings
import structlog

logger = structlog.get_logger()


def _get_sync_session():
    """Get a synchronous DB session for Celery tasks."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(settings.DATABASE_URL_SYNC, pool_size=5, max_overflow=10)
    Session = sessionmaker(bind=engine)
    return Session()


def _ensure_source(session, source_name: str, source_type: str = "aggregator", reliability: float = 0.7, official: bool = False) -> uuid.UUID:
    """Ensure a source exists in DB, create if not."""
    from app.db.models import Source
    existing = session.execute(
        select(Source).where(Source.name == source_name)
    ).scalar_one_or_none()

    if existing:
        return existing.id

    source = Source(
        id=uuid.uuid4(),
        name=source_name,
        base_url="",
        source_type=source_type,
        reliability_score=reliability,
        official_flag=official,
        tier=1 if reliability >= 0.90 else 2,
    )
    session.add(source)
    session.flush()
    return source.id


def _process_and_store(session, raw_items: list[dict], default_source_type: str = "aggregator"):
    """Process raw items: normalize, extract entities, classify, deduplicate, store."""
    from app.db.models import Article, Event, EventCluster

    stored_count = 0
    for raw in raw_items:
        try:
            normalized = normalize_article(raw)

            if not normalized["url"] or not normalized["title"]:
                continue

            # Check URL uniqueness
            existing = session.execute(
                select(Article.id).where(Article.url == normalized["url"])
            ).scalar_one_or_none()
            if existing:
                continue

            # Ensure source
            reliability = raw.get("reliability", 0.7)
            official = raw.get("official", False)
            source_id = _ensure_source(
                session,
                normalized["source_name"],
                source_type=default_source_type,
                reliability=reliability,
                official=official,
            )

            # Store article
            article = Article(
                id=uuid.uuid4(),
                source_id=source_id,
                published_at=normalized["published_at"],
                title=normalized["title"],
                url=normalized["url"],
                author=normalized.get("author"),
                language=normalized.get("language", "en"),
                raw_summary=normalized["summary"],
                hash=normalized["hash"],
                metadata_=normalized.get("metadata", {}),
            )
            session.add(article)

            # Extract entities
            full_text = f"{normalized['title']} {normalized['summary']}"
            entities = extract_entities(full_text)

            # Classify
            classification = classify_event(normalized["title"], normalized["summary"])

            if classification["category"] == "unclassified":
                continue

            # Compute fingerprint for dedup
            ts_bucket = time_bucket(normalized["published_at"].isoformat() if isinstance(normalized["published_at"], datetime) else normalized["published_at"])
            fp = compute_fingerprint(
                normalized["title"],
                entities["actor_tags"],
                entities["location_tags"],
                classification["category"],
                ts_bucket,
            )

            # Create event
            event = Event(
                id=uuid.uuid4(),
                timestamp_utc=normalized["published_at"] if isinstance(normalized["published_at"], datetime) else datetime.now(timezone.utc),
                source_id=source_id,
                source_reliability=reliability,
                title=normalized["title"],
                summary=normalized["summary"][:2000],
                category=classification["category"],
                severity=classification["severity"],
                confidence=classification["confidence"],
                novelty=0.5,  # Will be refined later
                actor_tags=entities["actor_tags"],
                country_tags=entities["country_tags"],
                location_tags=entities["location_tags"],
                signal_payload=classification.get("signal_payload", {}),
                dedupe_hash=fp,
            )
            session.add(event)
            stored_count += 1

        except Exception as e:
            logger.warning("process_item_error", error=str(e), title=raw.get("title", "")[:80])
            continue

    session.commit()
    return stored_count


@celery_app.task(name="app.services.tasks.collect_tasks.collect_gdelt")
def collect_gdelt():
    """Fetch latest GDELT events and store them."""
    logger.info("task_collect_gdelt_start")

    async def _fetch():
        client = GDELTClient()
        try:
            return await client.fetch_latest()
        finally:
            await client.close()

    raw_items = asyncio.run(_fetch())

    session = _get_sync_session()
    try:
        count = _process_and_store(session, raw_items, default_source_type="structured")
        logger.info("task_collect_gdelt_done", stored=count, fetched=len(raw_items))
        return {"fetched": len(raw_items), "stored": count}
    except Exception as e:
        session.rollback()
        logger.error("task_collect_gdelt_error", error=str(e))
        raise
    finally:
        session.close()


@celery_app.task(name="app.services.tasks.collect_tasks.collect_newsdata")
def collect_newsdata():
    """Fetch latest NewsData.io articles and store them."""
    logger.info("task_collect_newsdata_start")

    async def _fetch():
        client = NewsDataClient()
        try:
            return await client.fetch_latest()
        finally:
            await client.close()

    raw_items = asyncio.run(_fetch())

    session = _get_sync_session()
    try:
        count = _process_and_store(session, raw_items, default_source_type="news_api")
        logger.info("task_collect_newsdata_done", stored=count, fetched=len(raw_items))
        return {"fetched": len(raw_items), "stored": count}
    except Exception as e:
        session.rollback()
        logger.error("task_collect_newsdata_error", error=str(e))
        raise
    finally:
        session.close()


@celery_app.task(name="app.services.tasks.collect_tasks.collect_rss")
def collect_rss():
    """Fetch latest RSS feed items and store them."""
    logger.info("task_collect_rss_start")

    async def _fetch():
        client = RSSClient()
        try:
            return await client.fetch_all()
        finally:
            await client.close()

    raw_items = asyncio.run(_fetch())

    session = _get_sync_session()
    try:
        count = _process_and_store(session, raw_items, default_source_type="rss")
        logger.info("task_collect_rss_done", stored=count, fetched=len(raw_items))
        return {"fetched": len(raw_items), "stored": count}
    except Exception as e:
        session.rollback()
        logger.error("task_collect_rss_error", error=str(e))
        raise
    finally:
        session.close()


@celery_app.task(name="app.services.tasks.collect_tasks.collect_guardian")
def collect_guardian():
    """Fetch latest articles from The Guardian API."""
    logger.info("task_collect_guardian_start")

    async def _fetch():
        client = GuardianClient()
        try:
            return await client.fetch_latest()
        finally:
            await client.close()

    raw_items = asyncio.run(_fetch())

    session = _get_sync_session()
    try:
        count = _process_and_store(session, raw_items, default_source_type="news_api")
        logger.info("task_collect_guardian_done", stored=count, fetched=len(raw_items))
        return {"fetched": len(raw_items), "stored": count}
    except Exception as e:
        session.rollback()
        logger.error("task_collect_guardian_error", error=str(e))
        raise
    finally:
        session.close()


@celery_app.task(name="app.services.tasks.collect_tasks.collect_currents")
def collect_currents():
    """Fetch latest articles from Currents API."""
    logger.info("task_collect_currents_start")

    async def _fetch():
        client = CurrentsClient()
        try:
            return await client.fetch_latest()
        finally:
            await client.close()

    raw_items = asyncio.run(_fetch())

    session = _get_sync_session()
    try:
        count = _process_and_store(session, raw_items, default_source_type="news_api")
        logger.info("task_collect_currents_done", stored=count, fetched=len(raw_items))
        return {"fetched": len(raw_items), "stored": count}
    except Exception as e:
        session.rollback()
        logger.error("task_collect_currents_error", error=str(e))
        raise
    finally:
        session.close()


@celery_app.task(name="app.services.tasks.collect_tasks.collect_gnews")
def collect_gnews():
    """Fetch latest articles from GNews API."""
    logger.info("task_collect_gnews_start")

    async def _fetch():
        client = GNewsClient()
        try:
            return await client.fetch_latest()
        finally:
            await client.close()

    raw_items = asyncio.run(_fetch())

    session = _get_sync_session()
    try:
        count = _process_and_store(session, raw_items, default_source_type="news_api")
        logger.info("task_collect_gnews_done", stored=count, fetched=len(raw_items))
        return {"fetched": len(raw_items), "stored": count}
    except Exception as e:
        session.rollback()
        logger.error("task_collect_gnews_error", error=str(e))
        raise
    finally:
        session.close()
