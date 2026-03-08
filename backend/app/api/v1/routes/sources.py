from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Source
from app.schemas.source import SourceRead

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("", response_model=list[SourceRead])
async def list_sources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Source).order_by(Source.name))
    sources = result.scalars().all()
    return [SourceRead.model_validate(s) for s in sources]
