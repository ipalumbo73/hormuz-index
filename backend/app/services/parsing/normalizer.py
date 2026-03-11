import hashlib
import re
from datetime import datetime, timezone
from typing import Optional
import structlog

logger = structlog.get_logger()


def strip_html(text: str) -> str:
    """Remove HTML tags and decode entities from text."""
    if not text:
        return text
    # Remove img tags entirely (they carry no useful text)
    text = re.sub(r'<img[^>]*>', '', text, flags=re.IGNORECASE)
    # Remove all other HTML tags but keep their text content
    text = re.sub(r'<[^>]+>', ' ', text)
    # Decode common HTML entities
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    text = text.replace('&quot;', '"').replace('&#39;', "'").replace('&nbsp;', ' ')
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def normalize_article(raw: dict) -> dict:
    """Normalize a raw article/event from any source into canonical schema."""
    title = strip_html((raw.get("title") or "").strip())
    url = (raw.get("url") or raw.get("link") or "").strip()
    summary = strip_html((raw.get("summary") or raw.get("description") or raw.get("raw_summary") or "").strip())
    source_name = (raw.get("source_name") or "unknown").strip()

    pub = raw.get("published_at")
    if isinstance(pub, str):
        try:
            published_at = datetime.fromisoformat(pub.replace("Z", "+00:00"))
        except ValueError:
            published_at = datetime.now(timezone.utc)
    elif isinstance(pub, datetime):
        published_at = pub
    else:
        published_at = datetime.now(timezone.utc)

    content_hash = hashlib.sha256(f"{url}|{title}".encode()).hexdigest()

    return {
        "title": title,
        "url": url,
        "summary": summary[:2000] if summary else "",
        "source_name": source_name,
        "published_at": published_at,
        "hash": content_hash,
        "language": raw.get("language", "en"),
        "author": raw.get("author"),
        "metadata": {
            k: v for k, v in raw.items()
            if k not in ("title", "url", "summary", "source_name", "published_at", "hash", "language", "author", "content", "raw_content")
        }
    }


def normalize_text(text: str) -> str:
    """Normalize text for comparison: lowercase, strip punctuation, collapse whitespace."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()
