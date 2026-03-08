#!/bin/bash
set -e

echo "Creating database tables..."
python -c "
import asyncio
from app.db.base import engine, Base
import app.db.models  # register all models

async def create():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Tables created successfully')

asyncio.run(create())
" || echo "Table creation failed, will retry on startup"

echo "Seeding initial data..."
python -c "
from app.core.seed import seed_sources, seed_tuning_config
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL_SYNC)
Session = sessionmaker(bind=engine)
db = Session()
try:
    seed_sources(db)
    seed_tuning_config(db)
    db.close()
    print('Seed complete')
except Exception as e:
    print(f'Seed skipped: {e}')
    db.close()
" || echo "Seed skipped"

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
