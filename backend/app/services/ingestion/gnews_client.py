"""GNews API client (free tier: 100 req/day, 10 articles/req)."""
from datetime import datetime, timezone

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = structlog.get_logger()

GNEWS_BASE = "https://gnews.io/api/v4/search"

QUERIES = [
    "Iran nuclear IAEA",
    "Hormuz Gulf military",
    "Hezbollah Houthi proxy",
    "Iran Israel conflict",
]


class GNewsClient:
    """Async client for GNews API (free tier)."""

    def __init__(self, timeout: float = 20.0):
        self.client = httpx.AsyncClient(timeout=timeout)
        self.api_key: str = settings.GNEWS_API_KEY

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=2, max=15),
    )
    async def fetch_latest(self) -> list[dict]:
        if not self.api_key:
            logger.warning("gnews_no_api_key")
            return []

        all_items: list[dict] = []

        # Use only 2 queries per cycle to stay under 100/day limit
        for query in QUERIES[:2]:
            try:
                params = {
                    "token": self.api_key,
                    "q": query,
                    "lang": "en",
                    "max": 10,
                    "sortby": "publishedAt",
                }
                resp = await self.client.get(GNEWS_BASE, params=params)
                resp.raise_for_status()
                data = resp.json()

                for article in data.get("articles", []):
                    pub = article.get("publishedAt", "")
                    try:
                        pub_dt = datetime.fromisoformat(pub.replace("Z", "+00:00")) if pub else datetime.now(timezone.utc)
                    except (ValueError, AttributeError):
                        pub_dt = datetime.now(timezone.utc)

                    source = article.get("source", {})
                    all_items.append({
                        "title": article.get("title", ""),
                        "url": article.get("url", ""),
                        "source_name": source.get("name", "GNews"),
                        "published_at": pub_dt.isoformat(),
                        "summary": article.get("description", "") or "",
                        "reliability": 0.75,
                    })

            except httpx.HTTPStatusError as e:
                logger.error("gnews_http_error", status=e.response.status_code, query=query)
            except Exception as e:
                logger.error("gnews_error", error=str(e), query=query)

        logger.info("gnews_fetch_complete", count=len(all_items))
        return all_items

    async def close(self) -> None:
        await self.client.aclose()
