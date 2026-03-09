"""Endpoints returning Plotly JSON figures."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.db.models import IndexSnapshot, ScenarioSnapshot, Event
from app.utils.dates import parse_range

router = APIRouter(prefix="/charts", tags=["charts"])

PLOTLY_CONFIG = {
    "responsive": True,
    "displaylogo": False,
    "modeBarButtonsToRemove": ["lasso2d", "select2d"],
}

COLOR_MAP = {
    "contained": "#22c55e",
    "regional": "#f59e0b",
    "threshold": "#f97316",
    "coercive": "#ef4444",
    "actual": "#991b1b",
}

INDEX_COLORS = {
    "NOI": "#a855f7", "GAI": "#ef4444", "HDI": "#3b82f6",
    "PAI": "#f97316", "SRI": "#eab308", "BSI": "#dc2626", "DCI": "#22c55e",
}


SCENARIO_LABELS = {
    "contained": "Contenuto",
    "regional": "Regionale",
    "threshold": "Soglia Nucl.",
    "coercive": "Coercizione",
    "actual": "Uso Nucleare",
}

SCENARIO_LABELS_FULL = {
    "contained": "Conflitto Contenuto",
    "regional": "Guerra Regionale",
    "threshold": "Crisi Soglia Nucleare",
    "coercive": "Coercizione Nucleare",
    "actual": "Uso Nucleare Effettivo",
}

# Order from bottom (most likely) to top (most extreme) for stacked area
SCENARIO_STACK_ORDER = [
    ("contained", "contained_prob"),
    ("regional", "regional_prob"),
    ("threshold", "threshold_prob"),
    ("coercive", "coercive_prob"),
    ("actual", "actual_prob"),
]


@router.get("/scenario-timeline")
async def scenario_timeline(
    range: str = Query("7d", regex=r"^\d+[hd]$"),
    db: AsyncSession = Depends(get_db),
):
    since = parse_range(range)
    result = await db.execute(
        select(ScenarioSnapshot)
        .where(ScenarioSnapshot.timestamp_utc >= since)
        .order_by(ScenarioSnapshot.timestamp_utc)
    )
    snapshots = result.scalars().all()

    # Use ISO timestamps for proper axis formatting
    timestamps = [s.timestamp_utc.isoformat() for s in snapshots]

    traces = []
    for sc_name, db_field in SCENARIO_STACK_ORDER:
        short_label = SCENARIO_LABELS.get(sc_name, sc_name)
        full_label = SCENARIO_LABELS_FULL.get(sc_name, sc_name)
        values = [round(getattr(s, db_field, 0), 1) for s in snapshots]
        hover = [f"<b>{full_label}</b>: {v}%<br>{s.timestamp_utc.strftime('%d %b %H:%M')}" for v, s in zip(values, snapshots)]
        line_width = 1.5 if sc_name == "actual" else 2
        line_cfg = {"color": COLOR_MAP.get(sc_name, "#888"), "width": line_width}
        if sc_name == "actual":
            line_cfg["dash"] = "dot"
        traces.append({
            "x": timestamps,
            "y": values,
            "type": "scatter",
            "mode": "lines",
            "name": short_label,
            "line": line_cfg,
            "hovertext": hover,
            "hoverinfo": "text",
        })

    return {
        "data": traces,
        "layout": {
            "xaxis": {
                "showgrid": False,
                "type": "date",
                "tickformat": "%d/%m\n%H:%M",
                "nticks": 6,
                "tickfont": {"size": 9},
            },
            "yaxis": {
                "title": {"text": "Probabilita (%)", "font": {"size": 10}},
                "range": [0, 60],
                "gridcolor": "rgba(55,65,81,0.5)",
                "dtick": 10,
                "tickfont": {"size": 9},
            },
            "template": "plotly_dark",
            "legend": {
                "orientation": "v",
                "y": 1,
                "x": 1.02,
                "xanchor": "left",
                "yanchor": "top",
                "font": {"size": 10},
                "bgcolor": "rgba(0,0,0,0)",
                "tracegroupgap": 2,
            },
            "margin": {"t": 8, "r": 100, "b": 40, "l": 42},
            "hovermode": "x unified",
        },
        "config": PLOTLY_CONFIG,
        "meta": {"range": range},
    }


@router.get("/indices-gauges")
async def indices_gauges(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(IndexSnapshot).order_by(desc(IndexSnapshot.timestamp_utc)).limit(2)
    )
    snapshots = result.scalars().all()
    current = snapshots[0] if snapshots else None
    previous = snapshots[1] if len(snapshots) > 1 else None

    gauges = []
    for idx_name in ["NOI", "GAI", "HDI", "PAI", "SRI", "BSI", "DCI"]:
        val = getattr(current, idx_name.lower(), 0) if current else 0
        prev_val = getattr(previous, idx_name.lower(), 0) if previous else 0
        gauges.append({
            "type": "indicator",
            "mode": "gauge+number+delta",
            "value": val,
            "delta": {"reference": prev_val},
            "title": {"text": idx_name},
            "gauge": {
                "axis": {"range": [0, 100]},
                "bar": {"color": INDEX_COLORS.get(idx_name, "#888")},
                "steps": [
                    {"range": [0, 25], "color": "#dcfce7"},
                    {"range": [25, 50], "color": "#fef9c3"},
                    {"range": [50, 70], "color": "#fed7aa"},
                    {"range": [70, 85], "color": "#fecaca"},
                    {"range": [85, 100], "color": "#991b1b"},
                ],
            },
        })

    return {
        "data": gauges,
        "layout": {"template": "plotly_dark", "grid": {"rows": 1, "columns": 7}},
        "config": PLOTLY_CONFIG,
    }


NOI_COMPONENTS = [
    ("site_access_loss", "Perdita accesso ai siti", "Peso 25%", "#a855f7"),
    ("material_knowledge_loss", "Perdita conoscenza materiali", "Peso 25%", "#9333ea"),
    ("enrichment_verification_gap", "Gap verifica arricchimento", "Peso 20%", "#7c3aed"),
    ("underground_activity_signal", "Attività sotterranea", "Peso 10%", "#6d28d9"),
    ("technical_diplomatic_breakdown", "Rottura diplomatica tecnica", "Peso 10%", "#5b21b6"),
    ("conflicting_narratives_uncertainty", "Narrative contrastanti", "Peso 10%", "#4c1d95"),
]


@router.get("/noi-breakdown")
async def noi_breakdown(
    range: str = Query("7d", regex=r"^\d+[hd]$"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(IndexSnapshot).order_by(desc(IndexSnapshot.timestamp_utc)).limit(1)
    )
    snapshot = result.scalar_one_or_none()
    components = snapshot.noi_components if snapshot else {}

    labels = []
    values = []
    colors = []
    hover_texts = []
    for key, label, weight, color in NOI_COMPONENTS:
        val = components.get(key, 0)
        labels.append(label)
        values.append(val)
        colors.append(color)
        hover_texts.append(f"{label}<br>Valore: {val:.1f}/100<br>{weight}")

    return {
        "data": [{
            "type": "scatterpolar",
            "r": values + [values[0]],
            "theta": labels + [labels[0]],
            "fill": "toself",
            "fillcolor": "rgba(245,158,11,0.15)",
            "line": {"color": "#f59e0b"},
            "hovertext": hover_texts + [hover_texts[0]],
            "hoverinfo": "text",
            "name": "NOI",
        }],
        "layout": {
            "polar": {
                "radialaxis": {"visible": True, "range": [0, 20], "gridcolor": "#374151"},
                "angularaxis": {"gridcolor": "#374151"},
                "bgcolor": "rgba(0,0,0,0)",
            },
            "template": "plotly_dark",
            "margin": {"l": 60, "r": 60, "t": 30, "b": 30},
        },
        "config": PLOTLY_CONFIG,
    }


CATEGORY_LABELS = {
    "nuclear_posture_signal": "Postura nucleare (stati armati)",
    "nuclear_verification_gap": "Gap verifica nucleare",
    "enrichment_signal": "Segnale arricchimento",
    "military_strike": "Attacco militare",
    "missile_drone_attack": "Missili / Droni",
    "proxy_activity": "Attività proxy",
    "gulf_infrastructure_attack": "Attacco infrastrutture Golfo",
    "shipping_disruption": "Disruzione navale",
    "hormuz_threat": "Minaccia Hormuz",
    "strategic_rhetoric": "Retorica strategica",
    "diplomatic_contact": "Contatto diplomatico",
    "deescalation_signal": "Segnale de-escalation",
    "sanctions_or_economic_pressure": "Sanzioni / Pressione economica",
    "cyber_operation": "Operazione cyber",
    "civilian_casualty_mass_event": "Vittime civili",
    "nuclear_site_damage": "Danno siti nucleari",
    "underground_activity_signal": "Attività sotterranea",
}


@router.get("/event-heatmap")
async def event_heatmap(
    range: str = Query("7d", regex=r"^\d+[hd]$"),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func, cast, Date
    since = parse_range(range)
    result = await db.execute(
        select(
            cast(Event.timestamp_utc, Date).label("day"),
            Event.category,
            func.count(Event.id).label("count"),
        )
        .where(Event.timestamp_utc >= since)
        .group_by("day", Event.category)
        .order_by("day")
    )
    rows = result.all()

    days = sorted(set(str(r.day) for r in rows))
    categories = sorted(set(r.category for r in rows))

    CATEGORY_COLORS = {
        "strategic_rhetoric": "#8b5cf6",
        "sanctions_or_economic_pressure": "#3b82f6",
        "proxy_activity": "#22c55e",
        "missile_drone_attack": "#f59e0b",
        "military_strike": "#f97316",
        "gulf_infrastructure_attack": "#ef4444",
        "diplomatic_contact": "#06b6d4",
        "deescalation_signal": "#10b981",
    }

    traces = []
    for cat in categories:
        label = CATEGORY_LABELS.get(cat, cat.replace("_", " ").title())
        color = CATEGORY_COLORS.get(cat, "#64748b")
        counts = []
        hover = []
        for day in days:
            count = next((r.count for r in rows if str(r.day) == day and r.category == cat), 0)
            counts.append(count)
            hover.append(f"{label}<br>{day}<br>{count} eventi")
        traces.append({
            "type": "bar",
            "x": days,
            "y": counts,
            "name": label,
            "marker": {"color": color},
            "hovertext": hover,
            "hoverinfo": "text",
        })

    # Shorten category labels for legend
    SHORT_CAT_LABELS = {
        "nuclear_posture_signal": "Postura nucl.",
        "nuclear_verification_gap": "Gap verifica",
        "enrichment_signal": "Arricchimento",
        "military_strike": "Strike milit.",
        "missile_drone_attack": "Missili/droni",
        "proxy_activity": "Proxy",
        "gulf_infrastructure_attack": "Infrastrutture",
        "shipping_disruption": "Nav. disruption",
        "hormuz_threat": "Hormuz",
        "strategic_rhetoric": "Retorica",
        "diplomatic_contact": "Diplomazia",
        "deescalation_signal": "De-escalation",
        "sanctions_or_economic_pressure": "Sanzioni",
        "cyber_operation": "Cyber",
        "civilian_casualty_mass_event": "Vittime civili",
        "nuclear_site_damage": "Siti nucleari",
        "underground_activity_signal": "Sottoterra",
    }
    for tr in traces:
        full_name = tr["name"]
        for cat_key, short in SHORT_CAT_LABELS.items():
            cat_full = CATEGORY_LABELS.get(cat_key, "")
            if tr["name"] == cat_full:
                tr["name"] = short
                break

    return {
        "data": traces,
        "layout": {
            "barmode": "stack",
            "bargroupgap": 0.15,
            "template": "plotly_dark",
            "xaxis": {
                "tickformat": "%d/%m",
                "tickfont": {"size": 9},
            },
            "yaxis": {
                "title": {"text": "Eventi", "font": {"size": 10}},
                "gridcolor": "rgba(55,65,81,0.5)",
                "tickfont": {"size": 9},
            },
            "legend": {
                "orientation": "v",
                "y": 1,
                "x": 1.02,
                "xanchor": "left",
                "yanchor": "top",
                "font": {"size": 9},
                "bgcolor": "rgba(0,0,0,0)",
                "tracegroupgap": 1,
            },
            "margin": {"l": 35, "r": 110, "t": 8, "b": 35},
        },
        "config": PLOTLY_CONFIG,
    }


# ---------------------------------------------------------------------------
# Event Map – scattergeo of recent events on a Middle East map
# ---------------------------------------------------------------------------

GEO_LOOKUP: dict[str, tuple[float, float]] = {
    "iran": (32.4, 53.7),
    "israel": (31.0, 34.8),
    "iraq": (33.2, 43.7),
    "syria": (35.0, 38.0),
    "lebanon": (33.9, 35.5),
    "yemen": (15.5, 48.5),
    "saudi arabia": (23.9, 45.1),
    "qatar": (25.3, 51.2),
    "bahrain": (26.0, 50.5),
    "uae": (23.4, 53.8),
    "kuwait": (29.3, 47.5),
    "oman": (21.5, 55.9),
    "turkey": (39.9, 32.9),
    "egypt": (26.8, 30.8),
    "jordan": (30.6, 36.2),
    "gaza": (31.4, 34.4),
    "strait of hormuz": (26.6, 56.3),
    "beirut": (33.9, 35.5),
    "tehran": (35.7, 51.4),
    "natanz": (33.5, 51.9),
    "fordow": (34.9, 51.6),
    "isfahan": (32.7, 51.7),
    "usa": (38.9, -77.0),
    "russia": (55.8, 37.6),
    "china": (39.9, 116.4),
}


def _category_color(category: str) -> str:
    """Return a marker colour based on event category."""
    cat = (category or "").lower()
    if cat == "military_strike":
        return "#ef4444"          # red
    if cat.startswith("nuclear"):
        return "#a855f7"          # purple
    if cat.startswith("hormuz"):
        return "#3b82f6"          # blue
    if cat.startswith("proxy"):
        return "#f97316"          # orange
    if cat.startswith("diplomatic") or cat.startswith("deescalation"):
        return "#22c55e"          # green
    return "#94a3b8"              # gray (default)


def _resolve_coords(event: "Event") -> tuple[float, float] | None:
    """Return (lat, lon) for an event by scanning its location and country tags."""
    for tag_list in (event.location_tags or [], event.country_tags or []):
        if isinstance(tag_list, list):
            for tag in tag_list:
                coords = GEO_LOOKUP.get(str(tag).lower())
                if coords:
                    return coords
    return None


@router.get("/event-map")
async def event_map(
    range: str = Query("7d", regex=r"^\d+[hd]$"),
    db: AsyncSession = Depends(get_db),
):
    """Return a Plotly scattergeo figure of recent events on a Middle East map."""
    since = parse_range(range)
    result = await db.execute(
        select(Event)
        .where(Event.timestamp_utc >= since)
        .order_by(desc(Event.timestamp_utc))
    )
    events = result.scalars().all()

    # Collect per-category traces so the legend groups by category
    cat_traces: dict[str, dict] = {}
    for ev in events:
        coords = _resolve_coords(ev)
        if coords is None:
            continue
        lat, lon = coords
        color = _category_color(ev.category)
        cat_label = CATEGORY_LABELS.get(ev.category, (ev.category or "unknown").replace("_", " ").title())
        size = max(6, min(22, (ev.severity or 0.5) * 20))
        ts_str = ev.timestamp_utc.strftime("%d %b %Y %H:%M") if ev.timestamp_utc else ""
        hover = f"<b>{ev.title}</b><br>{cat_label}<br>{ts_str}"

        if ev.category not in cat_traces:
            cat_traces[ev.category] = {
                "type": "scattergeo",
                "lat": [],
                "lon": [],
                "text": [],
                "hovertext": [],
                "hoverinfo": "text",
                "mode": "markers",
                "name": cat_label,
                "marker": {
                    "color": color,
                    "size": [],
                    "opacity": 0.85,
                    "line": {"width": 0.5, "color": "rgba(255,255,255,0.3)"},
                },
            }
        trace = cat_traces[ev.category]
        trace["lat"].append(lat)
        trace["lon"].append(lon)
        trace["text"].append(ev.title)
        trace["hovertext"].append(hover)
        trace["marker"]["size"].append(size)

    return {
        "data": list(cat_traces.values()),
        "layout": {
            "template": "plotly_dark",
            "plot_bgcolor": "rgba(0,0,0,0)",
            "paper_bgcolor": "rgba(0,0,0,0)",
            "geo": {
                "scope": "world",
                "projection": {
                    "type": "natural earth",
                    "scale": 4,
                },
                "center": {"lat": 28, "lon": 48},
                "showland": True,
                "landcolor": "#1e293b",
                "showocean": True,
                "oceancolor": "#0f172a",
                "showcountries": True,
                "countrycolor": "#334155",
                "showlakes": False,
                "bgcolor": "rgba(0,0,0,0)",
            },
            "legend": {
                "orientation": "v",
                "y": 1,
                "x": 1.02,
                "xanchor": "left",
                "yanchor": "top",
                "font": {"size": 9},
                "bgcolor": "rgba(0,0,0,0)",
            },
            "margin": {"l": 0, "r": 100, "t": 8, "b": 0},
        },
        "config": PLOTLY_CONFIG,
        "meta": {"range": range},
    }
