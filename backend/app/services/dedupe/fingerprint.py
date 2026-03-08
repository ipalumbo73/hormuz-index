import hashlib
import re
from app.services.parsing.normalizer import normalize_text

def compute_fingerprint(title: str, actors: list[str], locations: list[str], category: str, timestamp_bucket: str) -> str:
    """Compute a deduplication fingerprint for an event."""
    norm_title = normalize_text(title)
    # Take first 8 significant words
    words = norm_title.split()[:8]
    title_key = " ".join(sorted(words))

    actors_key = ",".join(sorted(set(actors)))
    locations_key = ",".join(sorted(set(locations)))

    raw = f"{title_key}|{actors_key}|{locations_key}|{category}|{timestamp_bucket}"
    return hashlib.sha256(raw.encode()).hexdigest()

def time_bucket(dt_iso: str, hours: int = 6) -> str:
    """Create a time bucket string for deduplication."""
    from datetime import datetime
    try:
        if isinstance(dt_iso, str):
            dt = datetime.fromisoformat(dt_iso.replace("Z", "+00:00"))
        else:
            dt = dt_iso
        bucket = dt.hour // hours
        return f"{dt.strftime('%Y-%m-%d')}-B{bucket}"
    except Exception:
        return "unknown"
