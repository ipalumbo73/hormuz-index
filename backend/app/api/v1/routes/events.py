from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from uuid import UUID
from typing import Optional
from app.db.session import get_db
from app.db.models import Event
from app.db.models.article import Article
from app.schemas.event import EventRead, EventListResponse

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=EventListResponse)
async def list_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    category: Optional[str] = None,
    actor: Optional[str] = None,
    country: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Event)
    count_query = select(func.count(Event.id))

    if category:
        query = query.where(Event.category == category)
        count_query = count_query.where(Event.category == category)
    if actor:
        query = query.where(Event.actor_tags.contains([actor]))
        count_query = count_query.where(Event.actor_tags.contains([actor]))
    if country:
        query = query.where(Event.country_tags.contains([country]))
        count_query = count_query.where(Event.country_tags.contains([country]))

    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(desc(Event.timestamp_utc)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    events = result.scalars().all()

    # Batch-fetch article URLs (match by title + source_id, same as event-map)
    article_url_map: dict[tuple, str] = {}
    if events:
        titles = [ev.title for ev in events]
        source_ids = [ev.source_id for ev in events]
        art_result = await db.execute(
            select(Article.title, Article.source_id, Article.url)
            .where(Article.title.in_(titles), Article.source_id.in_(source_ids))
        )
        for row in art_result.all():
            article_url_map[(row[0], row[1])] = row[2]

    event_reads = []
    for e in events:
        er = EventRead.model_validate(e)
        er.article_url = article_url_map.get((e.title, e.source_id), None)
        event_reads.append(er)

    return EventListResponse(
        events=event_reads,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{event_id}", response_model=EventRead)
async def get_event(event_id: UUID, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    er = EventRead.model_validate(event)
    art_result = await db.execute(
        select(Article.url).where(Article.title == event.title, Article.source_id == event.source_id).limit(1)
    )
    url = art_result.scalar_one_or_none()
    if url:
        er.article_url = url
    return er
