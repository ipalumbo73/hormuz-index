"""Explainability endpoint — detailed breakdown of how each index is computed."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, text
from app.db.session import get_db
from app.db.models import IndexSnapshot, ScenarioSnapshot, Event
from app.utils.dates import hours_ago, days_ago
from app.services.scoring.indices import SIGNAL_INDEX_MAPPING, NOI_SIGNAL_KEYS, WINDOW_WEIGHTS, compute_subindex, compute_event_impact
from app.services.scoring.scenarios import WEIGHT_MATRIX, PRIORS, TRIGGER_RULES, SCENARIOS
from app.services.parsing.classifier import CATEGORY_RULES

router = APIRouter(prefix="/explain", tags=["explain"])

# Map signal keys to index names for reverse lookup
SIGNAL_TO_INDEX = {}
for idx_name, keys in SIGNAL_INDEX_MAPPING.items():
    for k in keys:
        SIGNAL_TO_INDEX[k] = idx_name
for k in NOI_SIGNAL_KEYS:
    SIGNAL_TO_INDEX[k] = "NOI"

# Categories that feed each index
INDEX_CATEGORIES = {}
for rule in CATEGORY_RULES:
    for sk in rule["signal_keys"]:
        idx = SIGNAL_TO_INDEX.get(sk, sk)
        if idx not in INDEX_CATEGORIES:
            INDEX_CATEGORIES[idx] = set()
        INDEX_CATEGORIES[idx].add(rule["category"])


@router.get("/indices")
async def explain_indices(db: AsyncSession = Depends(get_db)):
    """Full breakdown of each index: value, composition, contributing events, formula."""

    # Latest index snapshot
    idx_result = await db.execute(
        select(IndexSnapshot).order_by(desc(IndexSnapshot.timestamp_utc)).limit(1)
    )
    latest_idx = idx_result.scalar_one_or_none()

    # Previous snapshot for delta
    ref_time = hours_ago(24)
    prev_result = await db.execute(
        select(IndexSnapshot)
        .where(IndexSnapshot.timestamp_utc <= ref_time)
        .order_by(desc(IndexSnapshot.timestamp_utc))
        .limit(1)
    )
    prev_idx = prev_result.scalar_one_or_none()

    # Latest scenario for explaining how indices feed scenarios
    sc_result = await db.execute(
        select(ScenarioSnapshot).order_by(desc(ScenarioSnapshot.timestamp_utc)).limit(1)
    )
    latest_sc = sc_result.scalar_one_or_none()

    # Fetch events for each time window
    events_24h = await _fetch_events(db, hours_ago(24))
    events_7d = await _fetch_events(db, days_ago(7))

    indices_detail = {}

    for idx_name in ["NOI", "GAI", "HDI", "PAI", "SRI", "BSI", "DCI"]:
        current = float(getattr(latest_idx, idx_name.lower(), 0)) if latest_idx else 0
        previous = float(getattr(prev_idx, idx_name.lower(), 0)) if prev_idx else 0

        # Find contributing events
        categories = INDEX_CATEGORIES.get(idx_name, set())
        signal_keys = SIGNAL_INDEX_MAPPING.get(idx_name, [idx_name])
        if idx_name == "NOI":
            signal_keys = NOI_SIGNAL_KEYS

        contributing_events = []
        for ev in events_24h:
            payload = ev.get("signal_payload", {})
            matched_signals = [sk for sk in signal_keys if payload.get(sk, 0) > 0]
            if matched_signals or ev.get("category") in categories:
                impact = compute_event_impact(ev)
                contributing_events.append({
                    "title": ev["title"],
                    "category": ev.get("category", "unknown"),
                    "severity": round(ev.get("severity", 0), 2),
                    "confidence": round(ev.get("confidence", 0), 2),
                    "impact": round(impact, 4),
                    "signal_values": {sk: payload.get(sk, 0) for sk in matched_signals},
                    "source_id": ev.get("source_id", ""),
                    "timestamp": ev.get("timestamp_utc", ""),
                })

        # Sort by impact
        contributing_events.sort(key=lambda x: x["impact"], reverse=True)

        # Window scores
        window_scores = {}
        for sk in (SIGNAL_INDEX_MAPPING.get(idx_name, [idx_name]) if idx_name != "NOI" else []):
            window_scores["24h"] = compute_subindex(events_24h, sk)
            window_scores["7d"] = compute_subindex(events_7d, sk)

        # How this index feeds scenarios
        scenario_impact = {}
        for sc_name in SCENARIOS:
            w = WEIGHT_MATRIX.get(idx_name, {}).get(sc_name, 0)
            if w != 0:
                scenario_impact[sc_name] = {
                    "weight": w,
                    "contribution": round(w * current, 2),
                    "direction": "aumenta" if w > 0 else "riduce",
                }

        indices_detail[idx_name] = {
            "value": round(current, 2),
            "delta": round(current - previous, 2),
            "window_scores": {k: round(v, 2) for k, v in window_scores.items()},
            "contributing_events_24h": contributing_events[:20],
            "total_events_24h": len(contributing_events),
            "scenario_impact": scenario_impact,
            "categories_tracked": sorted(categories),
        }

    # NOI components
    noi_components = latest_idx.noi_components if latest_idx else {}
    indices_detail["NOI"]["noi_components"] = noi_components

    # Scenario breakdown
    scenarios_detail = {}
    if latest_sc:
        for sc_name in SCENARIOS:
            prob = getattr(latest_sc, f"{sc_name}_prob", 0)
            score = getattr(latest_sc, f"{sc_name}_score", 0)
            prior = PRIORS.get(sc_name, 0)

            # Compute per-index contributions
            contributions = []
            for idx_name in ["NOI", "GAI", "HDI", "PAI", "SRI", "BSI", "DCI"]:
                w = WEIGHT_MATRIX.get(idx_name, {}).get(sc_name, 0)
                idx_val = float(getattr(latest_idx, idx_name.lower(), 0)) if latest_idx else 0
                delta = w * idx_val
                if abs(delta) > 0.1:
                    contributions.append({
                        "index": idx_name,
                        "value": round(idx_val, 1),
                        "weight": w,
                        "contribution": round(delta, 2),
                    })
            contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)

            # CI
            ci = {}
            if latest_sc.explanations:
                ci_data = latest_sc.explanations.get("confidence_intervals", {})
                ci = ci_data.get(sc_name, {})

            scenarios_detail[sc_name] = {
                "probability": prob,
                "raw_score": round(score, 2),
                "prior": prior,
                "contributions": contributions,
                "ci": ci,
            }

    # Trigger rules status
    triggers_info = []
    if latest_idx:
        idx_vals = {
            name.upper(): float(getattr(latest_idx, name, 0))
            for name in ["noi", "gai", "hdi", "pai", "sri", "bsi", "dci"]
        }
        for rule in TRIGGER_RULES:
            fired = rule["condition"](idx_vals)
            triggers_info.append({
                "label": rule["label"],
                "fired": fired,
                "boost": rule.get("boost", {}),
                "dampen": rule.get("dampen", {}),
            })

    return {
        "indices": indices_detail,
        "scenarios": scenarios_detail,
        "triggers": triggers_info,
        "formula": {
            "event_impact": "source_reliability * confidence * severity * novelty",
            "subindex": "sum(impact * signal_value) / sum(impact)  [media pesata]",
            "rolling_window": "50% ultime 24h + 30% ultimi 7gg + 20% ultimi 30gg",
            "scenario": "prior + sum(weight * index_value) + trigger_boosts → normalizzato a 100%",
        },
        "last_updated": latest_idx.timestamp_utc.isoformat() if latest_idx else None,
    }


async def _fetch_events(db: AsyncSession, since) -> list[dict]:
    """Fetch events since a datetime as dicts."""
    result = await db.execute(
        select(Event)
        .where(Event.timestamp_utc >= since)
        .order_by(desc(Event.timestamp_utc))
    )
    events = result.scalars().all()
    return [
        {
            "title": e.title,
            "source_id": str(e.source_id) if e.source_id else "",
            "source_reliability": e.source_reliability,
            "confidence": e.confidence,
            "severity": e.severity,
            "novelty": e.novelty,
            "signal_payload": e.signal_payload or {},
            "category": e.category,
            "timestamp_utc": e.timestamp_utc.isoformat() if e.timestamp_utc else "",
        }
        for e in events
    ]
