from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, cast, Date
from app.db.session import get_db
from app.db.models import IndexSnapshot, ScenarioSnapshot, Alert, Event
from app.utils.dates import parse_range, hours_ago

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    """Main dashboard summary with latest indices, scenarios, alerts, and top movers."""
    # Latest indices
    idx_result = await db.execute(
        select(IndexSnapshot).order_by(desc(IndexSnapshot.timestamp_utc)).limit(1)
    )
    latest_idx = idx_result.scalar_one_or_none()

    # Index snapshot from ~24h ago for meaningful delta
    ref_time = hours_ago(24)
    idx_24h_result = await db.execute(
        select(IndexSnapshot)
        .where(IndexSnapshot.timestamp_utc <= ref_time)
        .order_by(desc(IndexSnapshot.timestamp_utc))
        .limit(1)
    )
    prev_idx = idx_24h_result.scalar_one_or_none()

    # Latest scenarios
    sc_result = await db.execute(
        select(ScenarioSnapshot).order_by(desc(ScenarioSnapshot.timestamp_utc)).limit(1)
    )
    latest_sc = sc_result.scalar_one_or_none()

    # Scenario snapshot from ~24h ago
    sc_24h_result = await db.execute(
        select(ScenarioSnapshot)
        .where(ScenarioSnapshot.timestamp_utc <= ref_time)
        .order_by(desc(ScenarioSnapshot.timestamp_utc))
        .limit(1)
    )
    prev_sc = sc_24h_result.scalar_one_or_none()

    # Recent alerts (unacknowledged)
    alerts_result = await db.execute(
        select(Alert)
        .where(Alert.acknowledged == False)
        .order_by(desc(Alert.timestamp_utc))
        .limit(10)
    )
    recent_alerts = alerts_result.scalars().all()

    # Recent events count
    events_24h_count = (await db.execute(
        select(func.count(Event.id)).where(Event.timestamp_utc >= hours_ago(24))
    )).scalar() or 0

    # Build indices with 24h deltas
    indices = {}
    if latest_idx:
        for idx_name in ["noi", "gai", "hdi", "pai", "sri", "bsi", "dci"]:
            current = getattr(latest_idx, idx_name, 0)
            previous = getattr(prev_idx, idx_name, 0) if prev_idx else 0
            indices[idx_name.upper()] = {
                "value": round(current, 2),
                "delta": round(current - previous, 2),
                "level": _get_level(current, idx_name),
            }

    # Build scenarios with 24h deltas
    scenarios = {}
    if latest_sc:
        for sc_name in ["contained", "regional", "threshold", "coercive", "actual"]:
            current_prob = getattr(latest_sc, f"{sc_name}_prob", 0)
            prev_prob = getattr(prev_sc, f"{sc_name}_prob", 0) if prev_sc else 0
            scenarios[sc_name] = {
                "probability": current_prob,
                "score": getattr(latest_sc, f"{sc_name}_score", 0),
                "delta": round(current_prob - prev_prob, 2),
            }

    # NER — Nuclear Escalation Risk
    if latest_sc:
        ner_value = round(
            getattr(latest_sc, "threshold_prob", 0)
            + getattr(latest_sc, "coercive_prob", 0)
            + getattr(latest_sc, "actual_prob", 0),
            2,
        )
        prev_ner = round(
            getattr(prev_sc, "threshold_prob", 0)
            + getattr(prev_sc, "coercive_prob", 0)
            + getattr(prev_sc, "actual_prob", 0),
            2,
        ) if prev_sc else 0

        indices["NER"] = {
            "value": ner_value,
            "delta": round(ner_value - prev_ner, 2),
            "level": _get_ner_level(ner_value),
        }

    # --- Sparkline history: daily averages for the last 7 days ---
    seven_days_ago = hours_ago(168)  # 7 * 24

    # Index sparklines
    idx_daily_result = await db.execute(
        select(
            cast(IndexSnapshot.timestamp_utc, Date).label("day"),
            func.avg(IndexSnapshot.noi).label("noi"),
            func.avg(IndexSnapshot.gai).label("gai"),
            func.avg(IndexSnapshot.hdi).label("hdi"),
            func.avg(IndexSnapshot.pai).label("pai"),
            func.avg(IndexSnapshot.sri).label("sri"),
            func.avg(IndexSnapshot.bsi).label("bsi"),
            func.avg(IndexSnapshot.dci).label("dci"),
        )
        .where(IndexSnapshot.timestamp_utc >= seven_days_ago)
        .group_by(cast(IndexSnapshot.timestamp_utc, Date))
        .order_by(cast(IndexSnapshot.timestamp_utc, Date))
    )
    idx_daily_rows = idx_daily_result.all()

    for idx_name in ["noi", "gai", "hdi", "pai", "sri", "bsi", "dci"]:
        key = idx_name.upper()
        if key in indices:
            indices[key]["history"] = [
                round(float(getattr(row, idx_name, 0) or 0), 1)
                for row in idx_daily_rows
            ]

    # NER sparkline (from scenario snapshots)
    sc_daily_result = await db.execute(
        select(
            cast(ScenarioSnapshot.timestamp_utc, Date).label("day"),
            func.avg(ScenarioSnapshot.threshold_prob).label("threshold_prob"),
            func.avg(ScenarioSnapshot.coercive_prob).label("coercive_prob"),
            func.avg(ScenarioSnapshot.actual_prob).label("actual_prob"),
        )
        .where(ScenarioSnapshot.timestamp_utc >= seven_days_ago)
        .group_by(cast(ScenarioSnapshot.timestamp_utc, Date))
        .order_by(cast(ScenarioSnapshot.timestamp_utc, Date))
    )
    sc_daily_rows = sc_daily_result.all()

    if "NER" in indices:
        indices["NER"]["history"] = [
            round(
                float(getattr(row, "threshold_prob", 0) or 0)
                + float(getattr(row, "coercive_prob", 0) or 0)
                + float(getattr(row, "actual_prob", 0) or 0),
                1,
            )
            for row in sc_daily_rows
        ]

    # Fetch confidence intervals from latest recompute
    # These are stored in the window data or computed on-the-fly
    index_ci = {}
    scenario_ci = {}
    if latest_idx:
        # Index CIs from window spread (difference between 24h and 7d gives natural uncertainty)
        for idx_name in ["noi", "gai", "hdi", "pai", "sri", "bsi", "dci"]:
            key = idx_name.upper()
            val = float(getattr(latest_idx, idx_name, 0))
            w24 = float((latest_idx.window_24h or {}).get(key, val))
            w7d = float((latest_idx.window_7d or {}).get(key, val))
            spread = max(5.0, abs(w24 - w7d) * 0.5, val * 0.12)
            index_ci[key] = {
                "ci_low": round(max(0, val - spread), 1),
                "ci_high": round(min(100, val + spread), 1),
            }
            if key in indices:
                indices[key]["ci_low"] = index_ci[key]["ci_low"]
                indices[key]["ci_high"] = index_ci[key]["ci_high"]

    if latest_sc and latest_sc.explanations:
        ci_data = latest_sc.explanations.get("confidence_intervals", {})
        for sc_name in ["contained", "regional", "threshold", "coercive", "actual"]:
            if sc_name in ci_data:
                scenario_ci[sc_name] = ci_data[sc_name]
                if sc_name in scenarios:
                    scenarios[sc_name]["ci_low"] = ci_data[sc_name].get("p5", 0)
                    scenarios[sc_name]["ci_high"] = ci_data[sc_name].get("p95", 0)

    # NER CI
    if "NER" in indices and scenario_ci:
        ner_ci_low = sum(scenario_ci.get(s, {}).get("p5", 0) for s in ["threshold", "coercive", "actual"])
        ner_ci_high = sum(scenario_ci.get(s, {}).get("p95", 0) for s in ["threshold", "coercive", "actual"])
        indices["NER"]["ci_low"] = round(ner_ci_low, 1)
        indices["NER"]["ci_high"] = round(ner_ci_high, 1)

    return {
        "indices": indices,
        "scenarios": scenarios,
        "noi_components": latest_idx.noi_components if latest_idx else {},
        "alerts": [
            {
                "id": str(a.id),
                "level": a.level,
                "title": a.title,
                "message": a.message,
                "timestamp": a.timestamp_utc.isoformat() if a.timestamp_utc else "",
            }
            for a in recent_alerts
        ],
        "events_24h_count": events_24h_count,
        "last_updated": latest_idx.timestamp_utc.isoformat() if latest_idx else None,
    }


def _get_ner_level(value: float) -> str:
    if value < 5: return "green"
    if value < 15: return "yellow"
    if value < 30: return "orange"
    if value < 50: return "red"
    return "dark_red"


def _get_level(value: float, idx_name: str) -> str:
    if idx_name == "dci":
        if value >= 60: return "green"
        if value >= 40: return "yellow"
        if value >= 20: return "orange"
        return "red"
    if value < 25: return "green"
    if value < 50: return "yellow"
    if value < 70: return "orange"
    if value < 85: return "red"
    return "dark_red"
