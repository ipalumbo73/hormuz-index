from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.db.session import get_db
from app.db.models import IndexSnapshot, ScenarioSnapshot, Event, Alert
from app.utils.dates import hours_ago

router = APIRouter(prefix="/briefing", tags=["briefing"])

INDEX_NAMES = ["noi", "gai", "hdi", "pai", "sri", "bsi", "dci"]

SCENARIO_LABELS = {
    "contained": "conflitto contenuto",
    "regional": "guerra regionale",
    "threshold": "crisi di soglia nucleare",
    "coercive": "escalation nucleare coercitiva",
    "actual": "uso nucleare effettivo",
}

SCENARIO_LABELS_EN = {
    "contained": "contained conflict",
    "regional": "regional war",
    "threshold": "nuclear threshold crisis",
    "coercive": "coercive nuclear escalation",
    "actual": "actual nuclear use",
}

INDEX_FULL_NAMES_IT = {
    "NOI": "Opacità Nucleare",
    "GAI": "Attacchi nel Golfo",
    "HDI": "Disruzione di Hormuz",
    "PAI": "Attivazione Proxy",
    "SRI": "Retorica Strategica",
    "BSI": "Segnale di Breakout",
    "DCI": "Raffreddamento Diplomatico",
}

INDEX_FULL_NAMES_EN = {
    "NOI": "Nuclear Opacity",
    "GAI": "Gulf Attack",
    "HDI": "Hormuz Disruption",
    "PAI": "Proxy Activation",
    "SRI": "Strategic Rhetoric",
    "BSI": "Breakout Signal",
    "DCI": "Diplomatic Cooling",
}


def _get_level(value: float, idx_name: str) -> str:
    if idx_name == "dci":
        if value >= 60:
            return "green"
        if value >= 40:
            return "yellow"
        if value >= 20:
            return "orange"
        return "red"
    if value < 25:
        return "green"
    if value < 50:
        return "yellow"
    if value < 70:
        return "orange"
    if value < 85:
        return "red"
    return "dark_red"


def _situation_word_it(biggest_delta: float) -> str:
    abs_d = abs(biggest_delta)
    if abs_d < 2:
        return "stabilità"
    if biggest_delta > 0:
        return "tensione moderata" if abs_d < 8 else "escalation"
    return "de-escalation moderata" if abs_d < 8 else "de-escalation"


def _situation_word_en(biggest_delta: float) -> str:
    abs_d = abs(biggest_delta)
    if abs_d < 2:
        return "stability"
    if biggest_delta > 0:
        return "moderate tension" if abs_d < 8 else "escalation"
    return "moderate de-escalation" if abs_d < 8 else "de-escalation"


def _build_summary_it(
    indices: dict,
    biggest_mover: dict,
    dominant: dict,
    dci_value: float | None,
) -> str:
    situation = _situation_word_it(biggest_mover["delta"])
    parts = [f"Giornata di {situation}."]

    idx_key = biggest_mover["index"]
    idx_label = INDEX_FULL_NAMES_IT.get(idx_key, idx_key)
    val = indices[idx_key]["value"]
    delta = biggest_mover["delta"]
    direction = "salito" if delta > 0 else "sceso"
    parts.append(
        f"L'indice {idx_key} ({idx_label}) è {direction} a {val} "
        f"({'+' if delta > 0 else ''}{delta} in 24h)."
    )

    sc_label = SCENARIO_LABELS.get(dominant["name"], dominant["name"])
    parts.append(
        f"Lo scenario più probabile è {sc_label} ({dominant['probability']}%)."
    )

    if dci_value is not None:
        if dci_value >= 60:
            parts.append(f"I canali diplomatici restano attivi (DCI {dci_value}).")
        elif dci_value >= 40:
            parts.append(
                f"I canali diplomatici restano parzialmente attivi (DCI {dci_value})."
            )
        else:
            parts.append(
                f"I canali diplomatici sono in forte deterioramento (DCI {dci_value})."
            )

    return " ".join(parts)


def _build_summary_en(
    indices: dict,
    biggest_mover: dict,
    dominant: dict,
    dci_value: float | None,
) -> str:
    situation = _situation_word_en(biggest_mover["delta"])
    parts = [f"Day of {situation}."]

    idx_key = biggest_mover["index"]
    idx_label = INDEX_FULL_NAMES_EN.get(idx_key, idx_key)
    val = indices[idx_key]["value"]
    delta = biggest_mover["delta"]
    direction = "risen" if delta > 0 else "fallen"
    parts.append(
        f"The {idx_key} index ({idx_label}) has {direction} to {val} "
        f"({'+' if delta > 0 else ''}{delta} in 24h)."
    )

    sc_label = SCENARIO_LABELS_EN.get(dominant["name"], dominant["name"])
    parts.append(
        f"The most likely scenario is {sc_label} ({dominant['probability']}%)."
    )

    if dci_value is not None:
        if dci_value >= 60:
            parts.append(
                f"Diplomatic channels remain active (DCI {dci_value})."
            )
        elif dci_value >= 40:
            parts.append(
                f"Diplomatic channels remain partially active (DCI {dci_value})."
            )
        else:
            parts.append(
                f"Diplomatic channels are severely deteriorating (DCI {dci_value})."
            )

    return " ".join(parts)


@router.get("/daily")
async def get_daily_briefing(db: AsyncSession = Depends(get_db)):
    """Return a structured daily briefing with indices, scenarios, top events, and auto-summary."""

    ref_time = hours_ago(24)

    # Latest index snapshot
    idx_result = await db.execute(
        select(IndexSnapshot).order_by(desc(IndexSnapshot.timestamp_utc)).limit(1)
    )
    latest_idx = idx_result.scalar_one_or_none()

    # Previous index snapshot (~24h ago)
    idx_24h_result = await db.execute(
        select(IndexSnapshot)
        .where(IndexSnapshot.timestamp_utc <= ref_time)
        .order_by(desc(IndexSnapshot.timestamp_utc))
        .limit(1)
    )
    prev_idx = idx_24h_result.scalar_one_or_none()

    # Latest scenario snapshot
    sc_result = await db.execute(
        select(ScenarioSnapshot)
        .order_by(desc(ScenarioSnapshot.timestamp_utc))
        .limit(1)
    )
    latest_sc = sc_result.scalar_one_or_none()

    # Top 5 events by severity in last 24h
    top_events_result = await db.execute(
        select(Event)
        .where(Event.timestamp_utc >= ref_time)
        .order_by(desc(Event.severity))
        .limit(5)
    )
    top_events = top_events_result.scalars().all()

    # Count of events in last 24h
    events_24h_count = (
        await db.execute(
            select(func.count(Event.id)).where(Event.timestamp_utc >= ref_time)
        )
    ).scalar() or 0

    # Active (unacknowledged) alerts count
    alerts_active = (
        await db.execute(
            select(func.count(Alert.id)).where(Alert.acknowledged == False)  # noqa: E712
        )
    ).scalar() or 0

    # Build indices dict with deltas and levels
    indices: dict = {}
    biggest_mover = {"index": "NOI", "delta": 0.0, "direction": "up"}

    if latest_idx:
        for idx_name in INDEX_NAMES:
            current = float(getattr(latest_idx, idx_name, 0) or 0)
            previous = float(getattr(prev_idx, idx_name, 0) or 0) if prev_idx else 0.0
            delta = round(current - previous, 2)
            key = idx_name.upper()
            indices[key] = {
                "value": round(current, 2),
                "delta": delta,
                "level": _get_level(current, idx_name),
            }
            if abs(delta) > abs(biggest_mover["delta"]):
                biggest_mover = {
                    "index": key,
                    "delta": delta,
                    "direction": "up" if delta >= 0 else "down",
                }

    # Determine dominant scenario
    dominant_scenario = {"name": "contained", "probability": 0.0}
    if latest_sc:
        for sc_name in ["contained", "regional", "threshold", "coercive", "actual"]:
            prob = float(getattr(latest_sc, f"{sc_name}_prob", 0) or 0)
            if prob > dominant_scenario["probability"]:
                dominant_scenario = {"name": sc_name, "probability": round(prob, 1)}

    # DCI value for summary text
    dci_value = indices.get("DCI", {}).get("value")

    # Auto-generate summaries
    if indices:
        summary_it = _build_summary_it(indices, biggest_mover, dominant_scenario, dci_value)
        summary_en = _build_summary_en(indices, biggest_mover, dominant_scenario, dci_value)
    else:
        summary_it = "Nessun dato disponibile per generare il briefing."
        summary_en = "No data available to generate the briefing."

    # Build top events list
    top_events_list = [
        {
            "title": ev.title,
            "category": ev.category,
            "severity": round(float(ev.severity), 2),
            "timestamp": ev.timestamp_utc.isoformat() if ev.timestamp_utc else "",
        }
        for ev in top_events
    ]

    return {
        "date": date.today().isoformat(),
        "summary_it": summary_it,
        "summary_en": summary_en,
        "indices": indices,
        "dominant_scenario": dominant_scenario,
        "top_events": top_events_list,
        "events_24h_count": events_24h_count,
        "alerts_active": alerts_active,
        "biggest_mover": biggest_mover,
    }
