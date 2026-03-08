# GeoRisk Monitor

Geopolitical risk early warning system focused on the Iran-USA-Israel crisis and regional/nuclear escalation risks.

## What it does

- **Ingests** events from GDELT, NewsData.io, and RSS feeds (Reuters, BBC, Al Jazeera, AP, IAEA)
- **Deduplicates** articles and clusters them into events
- **Classifies** events into 15 geopolitical categories
- **Computes 7 risk indices**: NOI (Nuclear Opacity), GAI (Gulf Attack), HDI (Hormuz Disruption), PAI (Proxy Activation), SRI (Strategic Rhetoric), BSI (Breakout Signal), DCI (Diplomatic Cooling)
- **Estimates 5 scenario probabilities**: Contained Conflict, Regional War, Nuclear Threshold Crisis, Coercive Go-Nuclear, Actual Nuclear Use
- **Auto-updates** every 5-15 minutes via Celery beat scheduler
- **Alerts** via in-app, Telegram, and Slack when thresholds are crossed

## Quick Start

### Prerequisites
- Docker and Docker Compose

### Run

```bash
# Clone and start
cp .env.example .env
# Edit .env to add your NEWSDATA_API_KEY (optional, GDELT works without keys)

docker compose up --build
```

- **Dashboard**: http://localhost:3501
- **API**: http://localhost:8501/api/v1/health
- **API Docs**: http://localhost:8501/docs

### Optional: Add NewsData.io API Key

Get a free key at https://newsdata.io and set `NEWSDATA_API_KEY` in `.env`.

## Architecture

```
GDELT / NewsData / RSS  →  Celery Workers  →  PostgreSQL
                                ↓
                          Scoring Engine  →  Index & Scenario Snapshots
                                ↓
                          Alert Engine  →  Telegram / Slack
                                ↓
                          FastAPI REST  →  Next.js Dashboard
```

## Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2, Pydantic v2, Celery, Redis
- **Database**: PostgreSQL 16
- **Frontend**: Next.js 14, React, Tailwind CSS, Plotly.js
- **Infra**: Docker Compose

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Health check |
| `GET /api/v1/dashboard/summary` | Full dashboard data |
| `GET /api/v1/events` | List events (paginated, filterable) |
| `GET /api/v1/indices/latest` | Latest risk indices |
| `GET /api/v1/indices/history?range=7d` | Index history |
| `GET /api/v1/scenarios/latest` | Latest scenario probabilities |
| `GET /api/v1/scenarios/history?range=30d` | Scenario history |
| `GET /api/v1/alerts` | Active alerts |
| `GET /api/v1/sources` | Data sources |
| `GET /api/v1/charts/*` | Plotly JSON figures |
| `POST /api/v1/admin/reingest` | Trigger manual ingestion |
| `POST /api/v1/admin/recompute-indices` | Trigger recomputation |

## Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/unit/ -v
```
