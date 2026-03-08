"""The Guardian Open Platform API client (free tier: 500 req/day, no key needed for basic)."""
from datetime import datetime, timezone
from typing import Optional

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = structlog.get_logger()

GUARDIAN_BASE = "https://content.guardianapis.com/search"

KEYWORDS = [
    "Iran nuclear",
    "IAEA",
    "Strait of Hormuz",
    "Hezbollah",
    "Houthi",
    "Iran Israel",
    "Gulf military",
    "Iran enrichment",
    "nuclear deal",
    "JCPOA",
    "Iran sanctions",
    "Red Sea shipping",
]


class GuardianClient:
    """Async client for The Guardian Content API (free tier)."""

    def __init__(self, timeout: float = 20.0):
        self.client = httpx.AsyncClient(timeout=timeout)
        self.api_key: str = settings.GUARDIAN_API_KEY or "test"

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=2, max=15),
    )
    async def fetch_latest(self) -> list[dict]:
        query = " OR ".join(KEYWORDS[:6])
        params = {
            "api-key": self.api_key,
            "q": query,
            "section": "world",
            "order-by": "newest",
            "page-size": 50,
            "show-fields": "trailText,byline",
        }

        try:
            resp = await self.client.get(GUARDIAN_BASE, params=params)
            resp.raise_for_status()
            data = resp.json()

            results = data.get("response", {}).get("results", [])
            items: list[dict] = []

            for article in results:
                pub = article.get("webPublicationDate", "")
                try:
                    pub_dt = datetime.fromisoformat(pub.replace("Z", "+00:00")) if pub else datetime.now(timezone.utc)
                except (ValueError, AttributeError):
                    pub_dt = datetime.now(timezone.utc)

                fields = article.get("fields", {})
                items.append({
                    "title": article.get("webTitle", ""),
                    "url": article.get("webUrl", ""),
                    "source_name": "The Guardian",
                    "published_at": pub_dt.isoformat(),
                    "summary": fields.get("trailText", "") or "",
                    "reliability": 0.88,
                })

            logger.info("guardian_fetch_complete", count=len(items))
            return items

        except httpx.HTTPStatusError as e:
            logger.error("guardian_http_error", status=e.response.status_code)
            return []
        except Exception as e:
            logger.error("guardian_error", error=str(e))
            return []

    async def close(self) -> None:
        await self.client.aclose()
