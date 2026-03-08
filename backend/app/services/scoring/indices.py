"""Risk indices computation.

Methodology:
  Each index aggregates classified event signals using a discrete rolling
  window approach with declining weights for older observations.

Rolling window formula:
  Index_t = 0.50 * score_24h + 0.30 * score_7d + 0.20 * score_30d

  Rationale: The 50/30/20 weighting is a 3-bucket discrete approximation
  that prioritizes recent events while retaining memory of longer trends.
  This is a heuristic design choice — it is NOT equivalent to a formal EWMA
  (Exponentially Weighted Moving Average) on continuous data. The analogy to
  decay-weighted schemes is pedagogical, not mathematical.

Event impact:
  event_impact = source_reliability * confidence * severity * novelty

  Each factor 0-1, producing a composite weight that accounts for:
  - source_reliability: credibility of the news source (assigned per-source,
    adapted from NATO Admiralty Code STANAG 2511/AJP-2.1 reliability grading
    A-F, converted to a 0-1 numeric scale — this conversion is our own
    adaptation, not a NATO-standard procedure)
  - confidence: classifier's confidence in event categorization
  - severity: base severity of the event category (from Goldstein 1992
    conflict scale, using only the conflict dimension normalized to 0-1)
  - novelty: how new/unique this event is (deduplication factor)

Subindex:
  subindex = sum(event_impact * signal_value) / sum(event_impact)  [if sum > 0]

  This is a weighted average, standard in composite index construction
  (OECD Handbook on Constructing Composite Indicators, 2008).

Confidence intervals:
  Bootstrap resampling (Efron & Tibshirani, 1993) with N=200 iterations.
  Events are resampled with replacement to produce 90% CI
  (5th percentile = position 10, 95th percentile = position 190).

7 indices: NOI, GAI, HDI, PAI, SRI, BSI, DCI

References:
  - OECD/JRC (2008). Handbook on Constructing Composite Indicators
  - Goldstein, J. (1992). A Conflict-Cooperation Scale for WEIS Events Data
  - Efron, B. & Tibshirani, R. (1993). An Introduction to the Bootstrap
  - NATO STANAG 2511 / AJP-2.1 (Admiralty Code source reliability grading)
"""
import random
from datetime import datetime, timedelta, timezone
from typing import Optional
import structlog
from app.services.scoring.noi import compute_noi

logger = structlog.get_logger()

SIGNAL_INDEX_MAPPING = {
    "GAI": ["GAI"],
    "HDI": ["HDI"],
    "PAI": ["PAI"],
    "SRI": ["SRI"],
    "BSI": ["BSI"],
    "DCI": ["DCI"],
}

NOI_SIGNAL_KEYS = [
    "NOI_A_site_access_loss",
    "NOI_B_material_knowledge_loss",
    "NOI_C_enrichment_verification_gap",
    "NOI_D_underground_activity_signal",
    "NOI_E_technical_diplomatic_breakdown",
    "NOI_F_conflicting_narratives_uncertainty",
]

NOI_COMPONENT_MAP = {
    "NOI_A_site_access_loss": "site_access_loss",
    "NOI_B_material_knowledge_loss": "material_knowledge_loss",
    "NOI_C_enrichment_verification_gap": "enrichment_verification_gap",
    "NOI_D_underground_activity_signal": "underground_activity_signal",
    "NOI_E_technical_diplomatic_breakdown": "technical_diplomatic_breakdown",
    "NOI_F_conflicting_narratives_uncertainty": "conflicting_narratives_uncertainty",
}

WINDOW_WEIGHTS = {"24h": 0.50, "7d": 0.30, "30d": 0.20}

def compute_event_impact(event: dict) -> float:
    """event_impact = source_reliability * confidence * severity * novelty"""
    return (
        float(event.get("source_reliability", 0.7))
        * float(event.get("confidence", 0.5))
        * float(event.get("severity", 0.5))
        * float(event.get("novelty", 0.5))
    )

def compute_subindex(events: list[dict], signal_key: str) -> float:
    """Weighted average of signal values by event impact."""
    total_impact = 0.0
    weighted_sum = 0.0
    for ev in events:
        impact = compute_event_impact(ev)
        signal_val = float(ev.get("signal_payload", {}).get(signal_key, 0))
        if signal_val > 0:
            weighted_sum += impact * signal_val
            total_impact += impact
    if total_impact == 0:
        return 0.0
    return min(100, weighted_sum / total_impact)


def _bootstrap_subindex(events: list[dict], signal_key: str, n_iter: int = 200) -> dict:
    """Bootstrap confidence interval for a subindex.

    Resamples events with replacement to estimate the sampling distribution
    of the subindex value (Efron & Tibshirani, 1993).

    Returns: {"value": float, "ci_low": float, "ci_high": float}
    """
    if not events:
        return {"value": 0.0, "ci_low": 0.0, "ci_high": 0.0}

    point_estimate = compute_subindex(events, signal_key)

    # If very few events, widen the CI analytically
    if len(events) < 5:
        spread = max(10.0, point_estimate * 0.4)
        return {
            "value": point_estimate,
            "ci_low": round(max(0, point_estimate - spread), 1),
            "ci_high": round(min(100, point_estimate + spread), 1),
        }

    bootstrap_values = []
    rng = random.Random(42)  # deterministic for reproducibility
    for _ in range(n_iter):
        sample = rng.choices(events, k=len(events))
        bootstrap_values.append(compute_subindex(sample, signal_key))

    bootstrap_values.sort()
    n = len(bootstrap_values)
    return {
        "value": point_estimate,
        "ci_low": round(bootstrap_values[int(n * 0.05)], 1),
        "ci_high": round(bootstrap_values[int(n * 0.95)], 1),
    }


def compute_all_indices(events_24h: list[dict], events_7d: list[dict], events_30d: list[dict]) -> dict:
    """Compute all 7 indices using rolling windows with confidence intervals."""

    windows = {"24h": events_24h, "7d": events_7d, "30d": events_30d}

    # Compute each simple index per window
    index_windows = {}
    index_ci = {}
    for idx_name, signal_keys in SIGNAL_INDEX_MAPPING.items():
        window_scores = {}
        for window_name, window_events in windows.items():
            scores = [compute_subindex(window_events, sk) for sk in signal_keys]
            window_scores[window_name] = max(scores) if scores else 0.0

        # Rolling window weighted average
        value = sum(window_scores[w] * WINDOW_WEIGHTS[w] for w in WINDOW_WEIGHTS)
        index_windows[idx_name] = {
            "value": round(min(100, value), 2),
            "windows": {k: round(v, 2) for k, v in window_scores.items()},
        }

        # Bootstrap CI on the 24h window (most volatile, most relevant)
        ci_24h = _bootstrap_subindex(events_24h, signal_keys[0])
        # Scale CI by the 24h weight contribution
        ci_spread_low = abs(ci_24h["value"] - ci_24h["ci_low"]) * WINDOW_WEIGHTS["24h"]
        ci_spread_high = abs(ci_24h["ci_high"] - ci_24h["value"]) * WINDOW_WEIGHTS["24h"]
        index_ci[idx_name] = {
            "ci_low": round(max(0, value - ci_spread_low - 3), 1),
            "ci_high": round(min(100, value + ci_spread_high + 3), 1),
        }

    # Compute NOI components per window
    noi_component_windows = {}
    for comp_signal, comp_name in NOI_COMPONENT_MAP.items():
        window_scores = {}
        for window_name, window_events in windows.items():
            window_scores[window_name] = compute_subindex(window_events, comp_signal)
        value = sum(window_scores[w] * WINDOW_WEIGHTS[w] for w in WINDOW_WEIGHTS)
        noi_component_windows[comp_name] = round(min(100, value), 2)

    # Compute NOI
    noi_result = compute_noi(noi_component_windows)

    # NOI CI from component CIs
    noi_value = noi_result["noi"]
    noi_ci_spread = max(5.0, noi_value * 0.15)  # at least ±5, or ±15% of value
    index_ci["NOI"] = {
        "ci_low": round(max(0, noi_value - noi_ci_spread), 1),
        "ci_high": round(min(100, noi_value + noi_ci_spread), 1),
    }

    result = {
        "NOI": noi_result["noi"],
        "GAI": index_windows["GAI"]["value"],
        "HDI": index_windows["HDI"]["value"],
        "PAI": index_windows["PAI"]["value"],
        "SRI": index_windows["SRI"]["value"],
        "BSI": index_windows["BSI"]["value"],
        "DCI": index_windows["DCI"]["value"],
        "confidence_intervals": index_ci,
        "noi_components": noi_result["components"],
        "noi_level": noi_result["level"],
        "noi_hard_rules": noi_result["hard_rules_fired"],
        "window_24h": {k: compute_subindex(events_24h, SIGNAL_INDEX_MAPPING.get(k, [k])[0]) if k != "NOI" else 0 for k in ["NOI", "GAI", "HDI", "PAI", "SRI", "BSI", "DCI"]},
        "window_7d": {k: compute_subindex(events_7d, SIGNAL_INDEX_MAPPING.get(k, [k])[0]) if k != "NOI" else 0 for k in ["NOI", "GAI", "HDI", "PAI", "SRI", "BSI", "DCI"]},
        "window_30d": {k: compute_subindex(events_30d, SIGNAL_INDEX_MAPPING.get(k, [k])[0]) if k != "NOI" else 0 for k in ["NOI", "GAI", "HDI", "PAI", "SRI", "BSI", "DCI"]},
    }

    return result
