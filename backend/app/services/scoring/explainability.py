"""Build explainability JSON for scenario snapshots."""
import structlog

logger = structlog.get_logger()

def build_explanation(scenario_name: str, scenario_data: dict, indices: dict, recent_clusters: list[dict] = None) -> dict:
    """Build a detailed explanation for a scenario score change."""
    explanation = scenario_data.get("explanations", {}).get(scenario_name, {})

    result = {
        "scenario": scenario_name,
        "probability": scenario_data.get("probabilities", {}).get(scenario_name, 0),
        "score": scenario_data.get("scores", {}).get(scenario_name, 0),
        "top_positive_drivers": explanation.get("top_positive_drivers", []),
        "top_negative_drivers": explanation.get("top_negative_drivers", []),
        "trigger_rules_fired": [
            t for t in scenario_data.get("triggers_fired", [])
        ],
        "current_indices": {
            k: round(float(v), 2) for k, v in indices.items()
            if k in ("NOI", "GAI", "HDI", "PAI", "SRI", "BSI", "DCI")
        },
        "supporting_event_clusters": [],
    }

    if recent_clusters:
        result["supporting_event_clusters"] = [
            {
                "cluster_id": str(c.get("id", "")),
                "title": c.get("canonical_title", ""),
                "source_count": c.get("source_count", 0),
                "category": c.get("event_category", ""),
            }
            for c in recent_clusters[:5]
        ]

    return result
