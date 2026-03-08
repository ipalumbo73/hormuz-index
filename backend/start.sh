#\!/bin/bash
set -e

echo "Creating database tables..."
python -c "
import asyncio
from app.db.base import engine, Base
import app.db.models

async def create():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Tables created successfully')

asyncio.run(create())
" || echo "Table creation failed"

echo "Seeding initial data..."
python -c "
from app.core.seed import seed_database
seed_database()
print('Seed complete')
" || echo "Seed skipped"

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
