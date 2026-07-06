"""Collection tasks - fetch data from sources and persist to DB."""
import asyncio
import uuid
from datetime import datetime, timedelta
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
from app.services.dedupe.clustering import find_cluster_match, novelty_for_repetition
from app.core.config import settings
from app.utils.dates import utcnow, days_ago
import structlog

logger = structlog.get_logger()

# How far back to look for fuzzy cluster matches when assigning novelty.
CLUSTER_LOOKBACK_DAYS = 7

_sync_engine = None
_sync_sessionmaker = None

# Common retry policy for collection tasks: transient network/API failures
# are retried with exponential backoff instead of silently dropping a cycle.
TASK_RETRY_KWARGS = dict(
    autoretry_for=(Exception,),
    max_retries=2,
    retry_backoff=60,
    retry_backoff_max=600,
    retry_jitter=True,
)


def _get_sync_session():
    """Get a synchronous DB session for Celery tasks (shared engine/pool)."""
    global _sync_engine, _sync_sessionmaker
    if _sync_engine is None:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        _sync_engine = create_engine(
            settings.DATABASE_URL_SYNC, pool_size=5, max_overflow=5, pool_pre_ping=True
        )
        _sync_sessionmaker = sessionmaker(bind=_sync_engine)
    return _sync_sessionmaker()


def _ensure_source(session, source_name: str, source_type: str = "aggregator", reliability: float = 0.7, official: bool = False):
    """Ensure a source exists in DB, create if not.

    Returns (source_id, reliability_score). When the source already exists,
    the curated reliability from the DB wins over the client-provided default,
    so seeded/tuned reliability grades are actually applied to events.
    """
    from app.db.models import Source
    existing = session.execute(
        select(Source).where(Source.name == source_name)
    ).scalar_one_or_none()

    if existing:
        return existing.id, float(existing.reliability_score or reliability)

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
    return source.id, reliability


def _load_recent_clusters(session) -> list[dict]:
    """Load recently-active clusters for fuzzy dedup matching."""
    from app.db.models import EventCluster
    cutoff = days_ago(CLUSTER_LOOKBACK_DAYS)
    clusters = session.execute(
        select(EventCluster).where(EventCluster.last_seen_at >= cutoff)
    ).scalars().all()
    return [
        {
            "id": c.id,
            "canonical_title": c.canonical_title,
            "actor_tags": c.actor_tags or [],
            "obj": c,
        }
        for c in clusters
    ]


def _process_and_store(session, raw_items: list[dict], default_source_type: str = "aggregator"):
    """Process raw items: normalize, extract entities, classify, deduplicate, store.

    Deduplication is two-stage:
      1. Exact: identical fingerprint (title words + actors + locations +
         category + 6h time bucket) within the last 30 days -> no new event.
      2. Fuzzy: RapidFuzz title/actor match (>=88) against recent clusters ->
         event stored with decayed novelty (1.0, 0.5, 0.33, ... floor 0.15).
    """
    from app.db.models import Article, Event, EventCluster

    stored_count = 0
    recent_clusters = _load_recent_clusters(session)
    dedupe_cutoff = days_ago(30)

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
            official = raw.get("official", False)
            source_id, reliability = _ensure_source(
                session,
                normalized["source_name"],
                source_type=default_source_type,
                reliability=raw.get("reliability", 0.7),
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

            # Stage 1 -- exact duplicate: same fingerprint already produced an
            # event, keep the article as archive but do not double-count.
            exact_dup = session.execute(
                select(Event.id)
                .where(Event.dedupe_hash == fp, Event.timestamp_utc >= dedupe_cutoff)
                .limit(1)
            ).scalar_one_or_none()
            if exact_dup:
                continue

            # Stage 2 -- fuzzy cluster match: assign novelty and cluster_id.
            match = find_cluster_match(normalized["title"], entities["actor_tags"], recent_clusters)
            if match:
                cluster = match["obj"]
                prior_count = int(cluster.article_count or 1)
                cluster.article_count = prior_count + 1
                cluster.last_seen_at = utcnow()
                cluster.confidence = max(float(cluster.confidence or 0), classification["confidence"])
                novelty = novelty_for_repetition(prior_count)
                cluster_id = cluster.id
            else:
                cluster = EventCluster(
                    id=uuid.uuid4(),
                    cluster_key=fp,
                    canonical_title=normalized["title"],
                    event_category=classification["category"],
                    actor_tags=entities["actor_tags"],
                    country_tags=entities["country_tags"],
                    location_tags=entities["location_tags"],
                    confidence=classification["confidence"],
                    source_count=1,
                    article_count=1,
                )
                session.add(cluster)
                session.flush()
                recent_clusters.append({
                    "id": cluster.id,
                    "canonical_title": cluster.canonical_title,
                    "actor_tags": cluster.actor_tags or [],
                    "obj": cluster,
                })
                novelty = 1.0
                cluster_id = cluster.id

            # Create event
            event = Event(
                id=uuid.uuid4(),
                cluster_id=cluster_id,
                timestamp_utc=normalized["published_at"] if isinstance(normalized["published_at"], datetime) else utcnow(),
                source_id=source_id,
                source_reliability=reliability,
                title=normalized["title"],
                summary=normalized["summary"][:2000],
                category=classification["category"],
                severity=classification["severity"],
                confidence=classification["confidence"],
                novelty=round(novelty, 3),
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


@celery_app.task(name="app.services.tasks.collect_tasks.collect_gdelt", **TASK_RETRY_KWARGS)
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


@celery_app.task(name="app.services.tasks.collect_tasks.collect_newsdata", **TASK_RETRY_KWARGS)
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


@celery_app.task(name="app.services.tasks.collect_tasks.collect_rss", **TASK_RETRY_KWARGS)
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


@celery_app.task(name="app.services.tasks.collect_tasks.collect_guardian", **TASK_RETRY_KWARGS)
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


@celery_app.task(name="app.services.tasks.collect_tasks.collect_currents", **TASK_RETRY_KWARGS)
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


@celery_app.task(name="app.services.tasks.collect_tasks.collect_gnews", **TASK_RETRY_KWARGS)
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
