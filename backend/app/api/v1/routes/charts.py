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
    # --- Countries ---
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
    "united arab emirates": (23.4, 53.8),
    "kuwait": (29.3, 47.5),
    "oman": (21.5, 55.9),
    "turkey": (39.9, 32.9),
    "turkiye": (39.9, 32.9),
    "egypt": (26.8, 30.8),
    "jordan": (30.6, 36.2),
    "palestine": (31.9, 35.2),
    "pakistan": (30.4, 69.3),
    "afghanistan": (33.9, 67.7),
    "usa": (38.9, -77.0),
    "united states": (38.9, -77.0),
    "russia": (55.8, 37.6),
    "china": (39.9, 116.4),
    "india": (20.6, 78.9),
    "uk": (51.5, -0.1),
    "united kingdom": (51.5, -0.1),
    "france": (48.9, 2.3),
    "germany": (52.5, 13.4),
    # --- Gaza / West Bank ---
    "gaza": (31.4, 34.4),
    "gaza strip": (31.4, 34.4),
    "west bank": (31.9, 35.2),
    "rafah": (31.3, 34.2),
    "khan younis": (31.3, 34.3),
    "khan yunis": (31.3, 34.3),
    "jabalia": (31.5, 34.5),
    "nablus": (32.2, 35.3),
    "jenin": (32.5, 35.3),
    "ramallah": (31.9, 35.2),
    "hebron": (31.5, 35.1),
    # --- Iran cities / nuclear sites ---
    "tehran": (35.7, 51.4),
    "isfahan": (32.7, 51.7),
    "esfahan": (32.7, 51.7),
    "natanz": (33.5, 51.9),
    "fordow": (34.9, 51.6),
    "bushehr": (28.9, 50.8),
    "arak": (34.1, 49.7),
    "tabriz": (38.1, 46.3),
    "shiraz": (29.6, 52.5),
    "mashhad": (36.3, 59.6),
    "bandar abbas": (27.2, 56.3),
    "chabahar": (25.3, 60.6),
    "kharg island": (29.2, 50.3),
    "parchin": (35.5, 51.8),
    "dimona": (31.1, 35.1),
    # --- Lebanon ---
    "beirut": (33.9, 35.5),
    "tyre": (33.3, 35.2),
    "sidon": (33.6, 35.4),
    "baalbek": (34.0, 36.2),
    "tripoli": (34.4, 35.8),
    # --- Syria ---
    "damascus": (33.5, 36.3),
    "aleppo": (36.2, 37.2),
    "homs": (34.7, 36.7),
    "latakia": (35.5, 35.8),
    "deir ez-zor": (35.3, 40.1),
    "idlib": (35.9, 36.6),
    "daraa": (32.6, 36.1),
    # --- Iraq ---
    "baghdad": (33.3, 44.4),
    "basra": (30.5, 47.8),
    "erbil": (36.2, 44.0),
    "mosul": (36.3, 43.1),
    "kirkuk": (35.5, 44.4),
    "sulaymaniyah": (35.6, 45.4),
    "tikrit": (34.6, 43.7),
    "fallujah": (33.3, 43.8),
    "karbala": (32.6, 44.0),
    "najaf": (32.0, 44.3),
    # --- Yemen ---
    "sanaa": (15.4, 44.2),
    "aden": (12.8, 45.0),
    "hodeidah": (14.8, 42.9),
    "marib": (15.5, 45.3),
    "taiz": (13.6, 44.0),
    # --- Saudi Arabia ---
    "riyadh": (24.7, 46.7),
    "jeddah": (21.5, 39.2),
    "mecca": (21.4, 39.8),
    "medina": (24.5, 39.6),
    "dhahran": (26.3, 50.1),
    "abqaiq": (25.9, 49.7),
    "yanbu": (24.1, 38.1),
    "neom": (27.0, 36.5),
    "ras tanura": (26.6, 50.2),
    # --- Gulf / Strategic ---
    "strait of hormuz": (26.6, 56.3),
    "hormuz": (26.6, 56.3),
    "bab el-mandeb": (12.6, 43.3),
    "suez canal": (30.5, 32.3),
    "suez": (30.0, 32.5),
    "persian gulf": (26.0, 52.0),
    "gulf of oman": (24.5, 58.5),
    "red sea": (20.0, 38.0),
    "arabian sea": (15.0, 60.0),
    # --- Israel cities ---
    "tel aviv": (32.1, 34.8),
    "jerusalem": (31.8, 35.2),
    "haifa": (32.8, 35.0),
    "beer sheva": (31.3, 34.8),
    "eilat": (29.6, 34.9),
    "ashkelon": (31.7, 34.6),
    "sderot": (31.5, 34.6),
    "golan heights": (33.0, 35.8),
    "negev": (30.8, 34.8),
    # --- Jordan ---
    "amman": (31.9, 35.9),
    # --- Egypt ---
    "cairo": (30.0, 31.2),
    "sinai": (29.5, 33.8),
    # --- Turkey ---
    "ankara": (39.9, 32.9),
    "istanbul": (41.0, 29.0),
    "incirlik": (37.0, 35.4),
    # --- Other relevant ---
    "abu dhabi": (24.5, 54.4),
    "dubai": (25.2, 55.3),
    "doha": (25.3, 51.5),
    "muscat": (23.6, 58.5),
    "kuwait city": (29.4, 47.9),
    "manama": (26.2, 50.6),
    # --- US bases / relevant locations ---
    "al udeid": (25.1, 51.3),
    "al dhafra": (24.2, 54.5),
    "camp arifjan": (29.1, 48.1),
    "diego garcia": (-7.3, 72.4),
    "pentagon": (38.9, -77.1),
    "washington": (38.9, -77.0),
    "new york": (40.7, -74.0),
    "vienna": (48.2, 16.4),  # IAEA HQ
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
    """Return (lat, lon) for an event by scanning tags, then title/summary text."""
    # 1. Try structured tags first (most reliable)
    for tag_list in (event.location_tags or [], event.country_tags or []):
        if isinstance(tag_list, list):
            for tag in tag_list:
                coords = GEO_LOOKUP.get(str(tag).lower())
                if coords:
                    return coords
    # 2. Fall back to scanning title + summary for known place names
    text = f"{event.title or ''} {event.summary or ''}".lower()
    # Check longer names first to avoid partial matches
    for name in sorted(GEO_LOOKUP.keys(), key=len, reverse=True):
        if name in text:
            return GEO_LOOKUP[name]
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
                "category_key": ev.category,
                "timestamps": [],
                "severities": [],
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
        trace["timestamps"].append(ev.timestamp_utc.isoformat() if ev.timestamp_utc else "")
        trace["severities"].append(round(float(ev.severity or 0.5), 3))

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
