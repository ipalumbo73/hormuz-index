# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**georisk-app** — A geopolitical early warning system focused on the Iran-USA-Israel crisis and regional/nuclear escalation risks. It ingests events from structured feeds, deduplicates them, classifies them into geopolitical signals, computes risk indices, and estimates scenario probabilities with full explainability.

The full specification is in `claude.md.txt` (written in Italian). Reference it for detailed formulas, weights, thresholds, and rules.

## Tech Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.x, Pydantic v2, Alembic, Celery, httpx, feedparser, tenacity, RapidFuzz (dedupe)
- **Database:** PostgreSQL 16, Redis 7
- **Frontend:** Next.js / React, Tailwind CSS, react-plotly.js (charts), Plotly JSON figures served from backend
- **Infra:** Docker Compose (services: postgres, redis, backend-api, backend-worker, backend-beat, frontend)

## Build & Run Commands

```bash
# Full stack
docker compose up --build

# Backend only (dev)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Database migrations
cd backend
alembic upgrade head
alembic revision --autogenerate -m "description"

# Celery worker
celery -A app.services.tasks worker --loglevel=info

# Celery beat (scheduler)
celery -A app.services.tasks beat --loglevel=info

# Frontend (dev)
cd frontend
npm install
npm run dev

# Tests
cd backend
pytest                        # all tests
pytest tests/unit/            # unit tests only
pytest tests/integration/     # integration tests only
pytest tests/unit/test_noi.py -k "test_hard_rules"  # single test
```

## Architecture

### Data Pipeline (runs on Celery beat schedule)

```
collect (GDELT/NewsData/GNews/RSS) → normalize → deduplicate/cluster → classify signals → compute indices → compute scenarios → evaluate alerts
```

Key pipeline file: `backend/app/services/tasks/` (collect_tasks, parse_tasks, score_tasks)

### Backend Services Layout

- `services/ingestion/` — Source-specific clients (gdelt, rss, newsdata, gnews, official feeds)
- `services/parsing/` — Normalizer, entity extractor, rule-based classifier
- `services/dedupe/` — Fingerprinting + RapidFuzz clustering (threshold 88% similarity)
- `services/scoring/` — NOI calculator, other indices, scenario scoring, explainability builder
- `services/alerts/` — Rule evaluation + multi-channel dispatch (in-app, email, Telegram, Slack)

### API Structure

- `api/v1/routes/` — REST endpoints: events, indices, scenarios, alerts, sources, admin
- `api/v1/routes/` also includes `/charts/*` endpoints returning Plotly JSON figures

### 7 Risk Indices (0–100 each)

| Index | Measures |
|-------|----------|
| NOI (Nuclear Opacity) | Loss of IAEA verification capability. 6 sub-components: A site_access 25%, B material_knowledge 25%, C enrichment_gap 20%, D underground 10%, E diplomatic_breakdown 10%, F narratives 10%. Has hard rules. |
| GAI (Gulf Attack) | Attacks on Gulf infrastructure |
| HDI (Hormuz Disruption) | Strait of Hormuz threats/interdiction |
| PAI (Proxy Activation) | Hezbollah/Houthi/militia activity |
| SRI (Strategic Rhetoric) | Escalatory language signals |
| BSI (Breakout Signal) | Nuclear breakout indicators |
| DCI (Diplomatic Cooling) | De-escalation / diplomacy signals (inverted risk) |

### Rolling Window Formula

`Index_t = 0.50 * score_24h + 0.30 * score_7d + 0.20 * score_30d`

### Event Impact

`event_impact = source_reliability × confidence × severity × novelty`

### 5 Scenarios

contained_conflict (prior 40), regional_war (25), nuclear_threshold_crisis (20), coercive_go_nuclear (10), actual_nuclear_use (5). Updated via weight matrix + trigger boosts (see `claude.md.txt` for exact values).

### Key Database Tables

sources, articles, event_clusters, events, index_snapshots, scenario_snapshots, alerts, tuning_configs — all use UUID PKs, JSONB for flexible payloads.

## Development Milestones

1. **M1:** Backend, DB models, migrations, ingestion, indices computation
2. **M2:** Scenario scoring, alerts, explainability JSON
3. **M3:** Frontend dashboard (Overview, Timeline, Scenario Tree, NOI breakdown, Sources, Admin)
4. **M4:** Hardening, tests, docs

## Important Conventions

- Configuration via environment variables (see `.env.example`)
- Structured JSON logging throughout
- Idempotent ingestion — URL unique constraint, dedupe_hash
- Resilience: if Redis fails, state rebuilds from PostgreSQL
- Source reliability scores drive event weighting (Reuters/AP 0.92-0.97, aggregators 0.70-0.85, social media excluded)
- Critical events require 2+ tier-1 sources or 1 official + 1 tier-1
- Never store full copyrighted article content — only title, summary, metadata, permitted excerpts
- pandas allowed only in batch/admin paths, never in request path
- Classification: Phase 1 rule-based, Phase 2 optional LLM, Phase 3 manual admin override
