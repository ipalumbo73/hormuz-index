from datetime import datetime, timezone
from typing import Optional

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = structlog.get_logger()

NEWSDATA_BASE = "https://newsdata.io/api/1/latest"

KEYWORDS = [
    "Iran nuclear",
    "IAEA Iran",
    "Strait of Hormuz",
    "Hezbollah Israel",
    "Houthi attack",
    "Iran Israel",
    "Iran USA",
    "Gulf military",
    "Iran enrichment",
    "Fordow",
    "Natanz",
    "Iran sanctions",
    "Iraq militia",
    "Syria strike",
    "Red Sea shipping",
    "Iran proxy",
    "nuclear deal",
    "JCPOA",
]


class NewsDataClient:
    """Client for the NewsData.io latest-news API."""

    def __init__(self, timeout: float = 30.0):
        self.client = httpx.AsyncClient(timeout=timeout)
        self.api_key: str = settings.NEWSDATA_API_KEY

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
    )
    async def fetch_latest(self, query: Optional[str] = None) -> list[dict]:
        """Return a list of article dicts from the NewsData.io API.

        If *query* is not supplied a default OR-joined keyword query is used.
        """
        if not self.api_key:
            logger.warning("newsdata_no_api_key")
            return []

        all_results: list[dict] = []
        # The API has a query-length limit; use the first five keywords.
        search_query = query or " OR ".join(KEYWORDS[:5])

        params = {
            "apikey": self.api_key,
            "q": search_query,
            "language": "en",
            "category": "politics,world",
        }

        try:
            resp = await self.client.get(NEWSDATA_BASE, params=params)
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") != "success":
                logger.warning("newsdata_api_error", response=data)
                return []

            for article in data.get("results", []):
                published = article.get("pubDate", "")
                try:
                    pub_dt = (
                        datetime.fromisoformat(
                            published.replace("Z", "+00:00")
                        )
                        if published
                        else datetime.now(timezone.utc)
                    )
                except (ValueError, AttributeError):
                    pub_dt = datetime.now(timezone.utc)

                all_results.append(
                    {
                        "title": article.get("title", ""),
                        "url": article.get("link", ""),
                        "source_name": article.get(
                            "source_name", article.get("source_id", "unknown")
                        ),
                        "published_at": pub_dt.isoformat(),
                        "summary": article.get("description", "") or "",
                        "content": article.get("content", ""),
                        "language": article.get("language", "en"),
                        "country": article.get("country", []),
                        "category": article.get("category", []),
                        "keywords": article.get("keywords") or [],
                        "image_url": article.get("image_url", ""),
                    }
                )

        except httpx.HTTPStatusError as e:
            logger.error(
                "newsdata_http_error", status=e.response.status_code
            )
        except Exception as e:
            logger.error("newsdata_error", error=str(e))

        logger.info("newsdata_fetch_complete", count=len(all_results))
        return all_results

    async def close(self) -> None:
        await self.client.aclose()
