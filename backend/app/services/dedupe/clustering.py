from rapidfuzz import fuzz
from typing import Optional
import structlog
from app.services.parsing.normalizer import normalize_text

logger = structlog.get_logger()

SIMILARITY_THRESHOLD = 88

def find_cluster_match(new_title: str, new_actors: list[str], existing_clusters: list[dict]) -> Optional[dict]:
    """Find if a new event matches an existing cluster.

    existing_clusters: list of dicts with keys: id, canonical_title, actor_tags, location_tags
    Returns the matched cluster dict or None.
    """
    norm_new = normalize_text(new_title)
    new_actor_set = set(new_actors)

    best_match = None
    best_score = 0

    for cluster in existing_clusters:
        norm_existing = normalize_text(cluster.get("canonical_title", ""))

        # Title similarity
        title_score = fuzz.token_sort_ratio(norm_new, norm_existing)

        if title_score < SIMILARITY_THRESHOLD:
            continue

        # Actor coherence bonus
        existing_actors = set(cluster.get("actor_tags", []))
        if new_actor_set and existing_actors:
            actor_overlap = len(new_actor_set & existing_actors) / max(len(new_actor_set), len(existing_actors))
            combined_score = title_score * 0.7 + actor_overlap * 100 * 0.3
        else:
            combined_score = title_score

        if combined_score > best_score and combined_score >= SIMILARITY_THRESHOLD:
            best_score = combined_score
            best_match = cluster

    if best_match:
        logger.debug("cluster_match_found", title=new_title[:60], cluster_id=best_match.get("id"), score=best_score)

    return best_match
