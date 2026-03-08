import re


def truncate(text: str, max_len: int = 500) -> str:
    if len(text) <= max_len:
        return text
    return text[:max_len - 3] + "..."


def clean_html(text: str) -> str:
    """Remove HTML tags from text."""
    return re.sub(r'<[^>]+>', '', text).strip()


def extract_excerpt(text: str, max_len: int = 300) -> str:
    """Extract a fair-use excerpt from text."""
    cleaned = clean_html(text)
    return truncate(cleaned, max_len)
