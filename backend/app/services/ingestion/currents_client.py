"""Currents API client (free tier: 600 req/day)."""
from datetime import datetime, timezone

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = structlog.get_logger()

CURRENTS_BASE = "https://api.currentsapi.services/v1/search"

KEYWORDS = [
    "Iran nuclear",
    "Strait of Hormuz",
    "Hezbollah Israel",
    "Houthi attack",
    "Iran Israel military",
    "Gulf crisis",
]


class CurrentsClient:
    """Async client for Currents API (free tier)."""

    def __init__(self, timeout: float = 20.0):
        self.client = httpx.AsyncClient(timeout=timeout)
        self.api_key: str = settings.CURRENTS_API_KEY

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=2, max=15),
    )
    async def fetch_latest(self) -> list[dict]:
        if not self.api_key:
            logger.warning("currents_no_api_key")
            return []

        query = " OR ".join(KEYWORDS[:4])
        params = {
            "apiKey": self.api_key,
            "keywords": query,
            "language": "en",
            "type": "1",  # news
        }

        try:
            resp = await self.client.get(CURRENTS_BASE, params=params)
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") != "ok":
                logger.warning("currents_api_error", response=data)
                return []

            items: list[dict] = []
            for article in data.get("news", []):
                pub = article.get("published", "")
                try:
                    pub_dt = datetime.fromisoformat(pub.replace("Z", "+00:00")) if pub else datetime.now(timezone.utc)
                except (ValueError, AttributeError):
                    pub_dt = datetime.now(timezone.utc)

                items.append({
                    "title": article.get("title", ""),
                    "url": article.get("url", ""),
                    "source_name": article.get("author", "Currents"),
                    "published_at": pub_dt.isoformat(),
                    "summary": article.get("description", "") or "",
                    "reliability": 0.70,
                })

            logger.info("currents_fetch_complete", count=len(items))
            return items

        except httpx.HTTPStatusError as e:
            logger.error("currents_http_error", status=e.response.status_code)
            return []
        except Exception as e:
            logger.error("currents_error", error=str(e))
            return []

    async def close(self) -> None:
        await self.client.aclose()
