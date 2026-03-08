from datetime import datetime, timedelta, timezone


def utcnow() -> datetime:
    return datetime.utcnow()


def hours_ago(hours: int) -> datetime:
    return utcnow() - timedelta(hours=hours)


def days_ago(days: int) -> datetime:
    return utcnow() - timedelta(days=days)


def parse_range(range_str: str) -> datetime:
    """Parse range string like '24h', '7d', '30d' into a datetime cutoff."""
    range_str = range_str.strip().lower()
    if range_str.endswith("h"):
        return hours_ago(int(range_str[:-1]))
    elif range_str.endswith("d"):
        return days_ago(int(range_str[:-1]))
    return days_ago(7)  # default
