<p align="center">
  <img src="https://img.shields.io/badge/status-live-brightgreen?style=flat-square" alt="Status">
  <img src="https://img.shields.io/badge/python-3.12-blue?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
</p>

# Hormuz Index

**Real-time geopolitical early warning system** monitoring the Iran-USA-Israel crisis and Gulf escalation risks.

> **Live at [hormuzindex.info](https://hormuzindex.info)** &nbsp;|&nbsp; Available in Italian and English

---

## What is Hormuz Index?

Hormuz Index is an open-source intelligence monitoring tool that automatically collects, classifies, and scores news from 30+ international media sources to track geopolitical tensions in the Persian Gulf region. It computes 7 risk indices and 5 escalation scenarios updated every 5-15 minutes.

### Important disclaimer

**This is not an intelligence system.** Hormuz Index analyzes the *tone of public media coverage*, not classified or verified intelligence. Media outlets have an inherent bias toward alarming news, and this bias is reflected in the index values. The indices measure how much the media is talking about a topic, not the actual risk level. Always compare with primary sources (IAEA, ICG) and expert analysis.

---

## Risk Indices (0-100)

| Index | Full Name | Measures |
|:-----:|-----------|----------|
| **NOI** | Nuclear Opacity Index | Loss of IAEA verification capability over Iran's nuclear program |
| **GAI** | Gulf Attack Index | Attacks on Gulf infrastructure (oil facilities, ports, pipelines) |
| **HDI** | Hormuz Disruption Index | Threats to shipping through the Strait of Hormuz |
| **PAI** | Proxy Activation Index | Hezbollah, Houthi, and militia activity levels |
| **SRI** | Strategic Rhetoric Index | Escalatory language from state actors |
| **BSI** | Breakout Signal Index | Nuclear breakout indicators and posture signals |
| **DCI** | Diplomatic Cooling Index | Diplomatic channel activity (inverse risk — higher = more diplomacy) |

Each index uses a rolling window formula: `Index = 0.50 × score_24h + 0.30 × score_7d + 0.20 × score_30d`

## Escalation Scenarios

Five scenarios with probability estimates and Monte Carlo confidence intervals:

| Scenario | Description | Calibration Note |
|----------|-------------|------------------|
| **Contained Conflict** | Crisis remains managed through conventional means | Prior: 55% — most crises historically stay contained |
| **Regional War** | Conventional military escalation across multiple states | Prior: 25% — based on ICG CrisisWatch data |
| **Nuclear Threshold** | Approach to nuclear capability (Iran enrichment) | Prior: 12% — extremely rare historically |
| **Coercive Nuclear** | Nuclear threats used as political leverage | Prior: 5% — only USA/Israel possess nuclear weapons |
| **Actual Nuclear Use** | Nuclear weapon detonation | Prior: 1% — zero instances since 1945 |

> **Note on nuclear scenarios:** Iran does not possess nuclear weapons. The "coercive" and "actual use" scenarios refer exclusively to the possibility that the USA or Israel might use theirs. The model explicitly assigns zero weight from Iran's nuclear program (NOI) to the "actual use" scenario.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                             │
│  GDELT · Reuters · BBC · AP · Al Jazeera · IAEA · CENTCOM      │
│  Financial Times · CNN · NewsData.io · 20+ RSS feeds            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Celery    │  ← Scheduled every 5-15 min
                    │   Workers   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │ Normalize │    │ Deduplicate│    │ Classify  │
   │ & Extract │    │ & Cluster │    │ (18 rules)│
   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
         └─────────────────┼─────────────────┘
                           ▼
                  ┌─────────────────┐
                  │  Scoring Engine │
                  │  7 Indices +    │
                  │  5 Scenarios +  │
                  │  Monte Carlo CI │
                  └────────┬────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │PostgreSQL│ │  Alert   │ │ FastAPI  │
        │ Snapshots│ │  Engine  │ │ REST API │
        └──────────┘ └────┬─────┘ └────┬─────┘
                          │            │
                     Telegram     ┌────▼─────┐
                     Slack        │ Next.js  │
                                  │Dashboard │
                                  └──────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend API** | Python 3.12, FastAPI, SQLAlchemy 2.x (async), Pydantic v2, Alembic |
| **Task Queue** | Celery + Redis (broker/backend) |
| **Database** | PostgreSQL 16 with JSONB for flexible payloads |
| **NLP/Classification** | Rule-based pattern matching (18 categories), RapidFuzz deduplication |
| **Scoring** | Rolling window indices, additive weighted scenarios, Bootstrap & Monte Carlo CI |
| **Frontend** | Next.js 14, React, Tailwind CSS, Plotly.js (interactive charts) |
| **Infrastructure** | Docker Compose (dev), Railway (production) |

---

## Quick Start

### Prerequisites

- Docker and Docker Compose

### Run locally

```bash
git clone https://github.com/ipalumbo73/hormuz-index.git
cd hormuz-index

# (Optional) Add API keys for additional sources
cp .env.example .env
# Edit .env: NEWSDATA_API_KEY, GUARDIAN_API_KEY, etc.
# GDELT and RSS work without any API keys

docker compose up --build
```

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3501 |
| API | http://localhost:8501/api/v1/health |
| API Docs (Swagger) | http://localhost:8501/docs |

### Run without Docker

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Celery worker (separate terminal)
celery -A app.services.tasks worker --loglevel=info

# Celery beat scheduler (separate terminal)
celery -A app.services.tasks beat --loglevel=info

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Requires PostgreSQL and Redis running locally.

---

## API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/dashboard/summary` | Full dashboard data (indices, scenarios, alerts, charts) |
| `GET` | `/api/v1/events?limit=50&page=1` | Paginated event list with filters |
| `GET` | `/api/v1/indices/latest` | Latest risk index values with confidence intervals |
| `GET` | `/api/v1/indices/history?range=7d` | Index history (1d, 7d, 30d) |
| `GET` | `/api/v1/scenarios/latest` | Latest scenario probabilities with explanations |
| `GET` | `/api/v1/scenarios/history?range=30d` | Scenario probability history |
| `GET` | `/api/v1/alerts` | Active alerts |
| `GET` | `/api/v1/sources` | Data source catalog with reliability scores |
| `GET` | `/api/v1/explain/model` | Full model explainability (drivers, triggers, weights) |

### Chart Endpoints (Plotly JSON)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/charts/index-timeline?range=7d` | Index timeline chart |
| `GET` | `/api/v1/charts/scenario-timeline?range=7d` | Scenario probability chart |
| `GET` | `/api/v1/charts/noi-breakdown?range=7d` | NOI sub-component breakdown |
| `GET` | `/api/v1/charts/event-heatmap?range=7d` | Event category heatmap |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/admin/seed` | Seed initial data sources |
| `POST` | `/api/v1/admin/reingest-sync` | Run data collection synchronously |
| `POST` | `/api/v1/admin/recompute-sync` | Recompute all indices and scenarios |
| `POST` | `/api/v1/admin/reclassify` | Re-classify all events with current rules |
| `POST` | `/api/v1/admin/reset-tuning` | Reset tuning config to latest defaults |

---

## Methodology

### Event Impact Formula

```
event_impact = source_reliability × confidence × severity × novelty
```

- **source_reliability** (0-1): Adapted from NATO Admiralty Code (STANAG 2511) reliability grading
- **confidence** (0-1): Classifier confidence based on pattern match ratio
- **severity** (0-1): Base severity per event category, calibrated to reflect media-sourced data
- **novelty** (0-1): Deduplication factor via RapidFuzz clustering (88% similarity threshold)

### NOI Sub-components

| Weight | Component | Signal |
|--------|-----------|--------|
| 25% | Site Access Loss | IAEA inspector access denial |
| 25% | Material Knowledge Loss | Loss of material accounting |
| 20% | Enrichment Verification Gap | Enrichment level uncertainty |
| 10% | Underground Activity | Fordow/tunnel activity signals |
| 10% | Diplomatic Breakdown | Technical diplomacy collapse |
| 10% | Conflicting Narratives | State narrative divergence |

### Scenario Scoring Model

The scenario model uses an **additive weighted scoring** approach (not Bayesian inference):

1. **Baseline scores** calibrated to historical base rates (ICG CrisisWatch 2003-2024)
2. **Weight matrix** encoding causal pathways from indices to scenarios
3. **Trigger conditions** for non-linear escalation dynamics
4. **Monte Carlo uncertainty** (500 iterations, ±15% index noise, ±20% weight noise)

Key design decision: NOI (Iran's nuclear program) has **zero weight** on the "actual nuclear use" scenario because Iran does not possess nuclear weapons.

### Academic References

1. International Crisis Group, CrisisWatch Database (2003-2024)
2. EU JRC, Global Conflict Risk Index (GCRI) methodology (2014)
3. Saltelli, A. et al., "Sensitivity Analysis in Practice", Wiley (2004)
4. OECD/JRC, Handbook on Constructing Composite Indicators (2008)
5. Goldstein, J., "A Conflict-Cooperation Scale for WEIS Events Data" (1992)
6. NATO STANAG 2511 / AJP-2.1 (source reliability grading)
7. GCR Institute, "Expert Survey on Global Catastrophic Risks" (2020)
8. Efron, B. & Tibshirani, R., "An Introduction to the Bootstrap" (1993)

---

## Project Structure

```
hormuz-index/
├── backend/
│   ├── app/
│   │   ├── api/v1/routes/       # REST endpoints
│   │   ├── core/                # Config, seed data, logging
│   │   ├── db/                  # SQLAlchemy models, session, migrations
│   │   ├── services/
│   │   │   ├── ingestion/       # Source clients (GDELT, RSS, NewsData, etc.)
│   │   │   ├── parsing/         # Normalizer, entity extractor, classifier
│   │   │   ├── dedupe/          # Fingerprinting + RapidFuzz clustering
│   │   │   ├── scoring/         # Index calculation, NOI, scenarios, explainability
│   │   │   ├── alerts/          # Rule evaluation + multi-channel dispatch
│   │   │   └── tasks/           # Celery task definitions + scheduling
│   │   └── main.py              # FastAPI application entry point
│   ├── tests/                   # Unit and integration tests
│   ├── alembic/                 # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── (main)/              # Italian pages (route group)
│   │   └── en/                  # English pages
│   ├── components/              # React components (gauges, charts, nav)
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

---

## Configuration

All configuration via environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL async connection string |
| `DATABASE_URL_SYNC` | Yes | PostgreSQL sync connection string (for Celery) |
| `REDIS_URL` | Yes | Redis connection string |
| `CELERY_BROKER_URL` | Yes | Celery broker (Redis) |
| `NEWSDATA_API_KEY` | No | NewsData.io API key (free tier available) |
| `GUARDIAN_API_KEY` | No | The Guardian API key |
| `GNEWS_API_KEY` | No | GNews API key |
| `TELEGRAM_BOT_TOKEN` | No | Telegram alert bot token |
| `TELEGRAM_CHAT_ID` | No | Telegram chat ID for alerts |
| `SLACK_WEBHOOK_URL` | No | Slack webhook for alerts |

> GDELT and RSS sources work without any API keys.

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

## License

MIT

---

<p align="center">
  <sub>Built with FastAPI, Next.js, and a commitment to transparent methodology.</sub><br>
  <sub>Hormuz Index is an experimental research tool — use responsibly.</sub>
</p>
