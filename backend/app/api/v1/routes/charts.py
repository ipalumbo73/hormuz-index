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


@router.get("/indices-timeline")
async def indices_timeline(
    range: str = Query("7d", regex=r"^\d+[hd]$"),
    db: AsyncSession = Depends(get_db),
):
    """Return a Plotly line chart with the 7 risk indices over time."""
    since = parse_range(range)
    result = await db.execute(
        select(IndexSnapshot)
        .where(IndexSnapshot.timestamp_utc >= since)
        .order_by(IndexSnapshot.timestamp_utc)
    )
    snapshots = result.scalars().all()
    timestamps = [s.timestamp_utc.isoformat() for s in snapshots]

    INDEX_ORDER = [
        ("NOI", "noi"), ("GAI", "gai"), ("HDI", "hdi"), ("PAI", "pai"),
        ("SRI", "sri"), ("BSI", "bsi"), ("DCI", "dci"),
    ]
    INDEX_LABEL = {
        "NOI": "Opacità Nucleare", "GAI": "Attacchi Golfo",
        "HDI": "Disruzione Hormuz", "PAI": "Attivazione Proxy",
        "SRI": "Retorica Strategica", "BSI": "Segnale Breakout",
        "DCI": "Raffreddamento Dipl.",
    }

    traces = []
    for label, db_field in INDEX_ORDER:
        values = [round(float(getattr(s, db_field, 0) or 0), 1) for s in snapshots]
        full_label = INDEX_LABEL.get(label, label)
        hover = [
            f"<b>{label}</b> ({full_label}): {v}<br>{s.timestamp_utc.strftime('%d %b %H:%M')}"
            for v, s in zip(values, snapshots)
        ]
        line_cfg = {"color": INDEX_COLORS.get(label, "#888"), "width": 2}
        if label == "DCI":
            line_cfg["dash"] = "dot"
        traces.append({
            "x": timestamps,
            "y": values,
            "type": "scatter",
            "mode": "lines",
            "name": label,
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
                "title": {"text": "Valore (0-100)", "font": {"size": 10}},
                "range": [0, 100],
                "gridcolor": "rgba(55,65,81,0.5)",
                "dtick": 20,
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
    # --- Additional locations for entity extractor coverage ---
    "abadan": (30.3, 48.3),
    "ahvaz": (31.3, 48.7),
    "kerman": (30.3, 57.1),
    "qom": (34.6, 50.9),
    "kiryat shmona": (33.2, 35.6),
    "metula": (33.3, 35.6),
    "nahariya": (33.0, 35.1),
    "tiberias": (32.8, 35.5),
    "tulkarm": (32.3, 35.0),
    "deir al-balah": (31.4, 34.3),
    "tripoli lebanon": (34.4, 35.8),
    "dahiyeh": (33.8, 35.5),
    "litani river": (33.3, 35.3),
    "nabatieh": (33.4, 35.5),
    "lebanon border": (33.1, 35.5),
    "raqqa": (35.9, 39.0),
    "tartus": (34.9, 35.9),
    "t4 air base": (34.5, 37.6),
    "al-bukamal": (34.5, 40.3),
    "iraq-syria corridor": (34.4, 41.0),
    "ain al-asad": (33.8, 42.4),
    "green zone": (33.3, 44.4),
    "mocha": (13.3, 43.3),
    "saudi oil hubs": (26.0, 50.0),
    "gulf of aden": (12.5, 47.0),
    "mediterranean": (34.0, 30.0),
    "new york un": (40.7, -74.0),
    "islamabad": (33.7, 73.0),
}


CATEGORY_COLORS_MAP = {
    "military_strike": "#ef4444",
    "missile_drone_attack": "#f97316",
    "nuclear_posture_signal": "#a855f7",
    "nuclear_verification_gap": "#9333ea",
    "enrichment_signal": "#7c3aed",
    "nuclear_site_damage": "#dc2626",
    "nuclear_transfer_signal": "#b91c1c",
    "proxy_activity": "#f59e0b",
    "gulf_infrastructure_attack": "#ef4444",
    "shipping_disruption": "#3b82f6",
    "hormuz_threat": "#0ea5e9",
    "strategic_rhetoric": "#8b5cf6",
    "diplomatic_contact": "#22c55e",
    "deescalation_signal": "#10b981",
    "sanctions_or_economic_pressure": "#6366f1",
    "cyber_operation": "#06b6d4",
    "civilian_casualty_mass_event": "#dc2626",
    "underground_activity_signal": "#7c3aed",
}


def _resolve_coords(event: "Event") -> tuple[float, float, str] | None:
    """Return (lat, lon, precision) for an event.

    precision is 'city' (exact), 'region', or 'country' (centroid fallback).
    """
    # 1. Try location_tags first (most specific: cities, sites)
    for tag in (event.location_tags or []):
        coords = GEO_LOOKUP.get(str(tag).lower())
        if coords:
            return coords[0], coords[1], "city"

    # 2. Try country_tags (centroid fallback)
    for tag in (event.country_tags or []):
        coords = GEO_LOOKUP.get(str(tag).lower())
        if coords:
            return coords[0], coords[1], "country"

    # 3. Fall back to scanning title + summary for known place names
    text = f"{event.title or ''} {event.summary or ''}".lower()
    # Check longer names first to avoid partial matches
    for name in sorted(GEO_LOOKUP.keys(), key=len, reverse=True):
        if name in text:
            lat, lon = GEO_LOOKUP[name]
            # Determine precision: if it's a country name, mark as 'country'
            country_names = {
                "iran", "israel", "iraq", "syria", "lebanon", "yemen",
                "saudi arabia", "qatar", "bahrain", "uae", "united arab emirates",
                "kuwait", "oman", "turkey", "turkiye", "egypt", "jordan",
                "palestine", "pakistan", "afghanistan", "usa", "united states",
                "russia", "china", "india", "uk", "united kingdom", "france", "germany",
            }
            prec = "country" if name in country_names else "city"
            return lat, lon, prec

    return None


def _jitter_coords(
    lat: float, lon: float, precision: str, event_hash: str
) -> tuple[float, float]:
    """Apply deterministic jitter to prevent marker stacking.

    City-level gets small jitter (±0.05°), country-level gets wider spread (±0.8°).
    """
    import hashlib

    h = hashlib.md5(event_hash.encode()).hexdigest()
    # Use different bits of the hash for lat/lon offsets
    lat_offset = (int(h[:4], 16) / 65535.0 - 0.5) * 2  # [-1, 1]
    lon_offset = (int(h[4:8], 16) / 65535.0 - 0.5) * 2  # [-1, 1]

    if precision == "city":
        return lat + lat_offset * 0.05, lon + lon_offset * 0.05
    elif precision == "country":
        return lat + lat_offset * 0.8, lon + lon_offset * 0.8
    return lat + lat_offset * 0.3, lon + lon_offset * 0.3


@router.get("/event-map")
async def event_map(
    range: str = Query("7d", regex=r"^\d+[hd]$"),
    db: AsyncSession = Depends(get_db),
):
    """Return flat event list with coordinates for the Leaflet map."""
    since = parse_range(range)
    result = await db.execute(
        select(Event)
        .where(Event.timestamp_utc >= since)
        .order_by(desc(Event.timestamp_utc))
    )
    events = result.scalars().all()

    map_events = []
    for ev in events:
        resolved = _resolve_coords(ev)
        if resolved is None:
            continue
        lat, lon, precision = resolved
        # Apply jitter using dedupe_hash or title as seed
        jitter_seed = ev.dedupe_hash or ev.title or str(ev.id)
        lat_j, lon_j = _jitter_coords(lat, lon, precision, jitter_seed)

        map_events.append({
            "id": str(ev.id),
            "lat": round(lat_j, 4),
            "lon": round(lon_j, 4),
            "lat_raw": lat,
            "lon_raw": lon,
            "title": ev.title or "",
            "summary": (ev.summary or "")[:200],
            "category": ev.category or "unknown",
            "severity": round(float(ev.severity or 0.5), 3),
            "confidence": round(float(ev.confidence or 0.5), 3),
            "source_reliability": round(float(ev.source_reliability or 0.7), 2),
            "timestamp": ev.timestamp_utc.isoformat() if ev.timestamp_utc else "",
            "precision": precision,
            "actors": ev.actor_tags or [],
            "locations": ev.location_tags or [],
            "countries": ev.country_tags or [],
        })

    # Category stats
    cat_counts: dict[str, int] = {}
    for e in map_events:
        cat_counts[e["category"]] = cat_counts.get(e["category"], 0) + 1

    # Region stats (count by raw coords)
    region_counts: dict[str, int] = {}
    for e in map_events:
        for country in (e["countries"] or []):
            region_counts[country] = region_counts.get(country, 0) + 1

    return {
        "events": map_events,
        "stats": {
            "total": len(map_events),
            "geolocated_pct": round(len(map_events) / max(len(events), 1) * 100, 1),
            "categories": dict(sorted(cat_counts.items(), key=lambda x: -x[1])),
            "regions": dict(sorted(region_counts.items(), key=lambda x: -x[1])[:15]),
        },
        "meta": {"range": range},
    }
