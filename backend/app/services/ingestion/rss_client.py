from datetime import datetime, timezone
from typing import Optional

import feedparser
import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

logger = structlog.get_logger()

DEFAULT_FEEDS: list[dict] = [
    # ── Tier 1: Wire agencies & major broadcasters (reliability 0.90+) ──
    {
        "name": "BBC World",
        "url": "http://feeds.bbci.co.uk/news/world/rss.xml",
        "reliability": 0.93,
    },
    {
        "name": "BBC Middle East",
        "url": "http://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
        "reliability": 0.93,
    },
    {
        "name": "Al Jazeera",
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "reliability": 0.88,
    },
    {
        "name": "AP News",
        "url": "https://feedx.net/rss/ap.xml",
        "reliability": 0.95,
    },
    {
        "name": "France24 Middle East",
        "url": "https://www.france24.com/en/middle-east/rss",
        "reliability": 0.88,
    },
    {
        "name": "DW World",
        "url": "https://rss.dw.com/rdf/rss-en-world",
        "reliability": 0.87,
    },
    {
        "name": "Reuters via Google News",
        "url": "https://news.google.com/rss/search?q=Iran+Israel+nuclear+Gulf+Hormuz&hl=en&gl=US&ceid=US:en",
        "reliability": 0.80,
    },
    # ── Tier 1.5: State media & alternative perspectives (reduce anglophone bias) ──
    {
        "name": "IRNA (Islamic Republic News Agency)",
        "url": "https://en.irna.ir/rss",
        "reliability": 0.75,
        "official": True,
    },
    {
        "name": "Press TV",
        "url": "https://www.presstv.ir/RSS",
        "reliability": 0.70,
        "official": True,
    },
    {
        "name": "Tasnim News Agency",
        "url": "https://www.tasnimnews.com/en/rss",
        "reliability": 0.72,
    },
    # ── Tier 2: Regional & specialized (reliability 0.80-0.90) ──
    {
        "name": "Times of Israel",
        "url": "https://www.timesofisrael.com/feed/",
        "reliability": 0.82,
    },
    {
        "name": "Middle East Eye",
        "url": "https://www.middleeasteye.net/rss",
        "reliability": 0.80,
    },
    {
        "name": "Iran International",
        "url": "https://www.iranintl.com/en/feed",
        "reliability": 0.78,
    },
    {
        "name": "Haaretz",
        "url": "https://www.haaretz.com/cmlink/1.4599589",
        "reliability": 0.82,
    },
    # ── Tier 3: Think tanks, nuclear & defense analysis ──
    {
        "name": "Arms Control Association",
        "url": "https://www.armscontrol.org/rss.xml",
        "reliability": 0.90,
        "official": True,
    },
    {
        "name": "Carnegie Endowment",
        "url": "https://carnegieendowment.org/rss/solr/?query=middle+east+nuclear&lang=en",
        "reliability": 0.90,
        "official": True,
    },
    {
        "name": "Brookings Middle East",
        "url": "https://www.brookings.edu/topic/middle-east-north-africa/feed/",
        "reliability": 0.88,
        "official": True,
    },
    {
        "name": "The Diplomat",
        "url": "https://thediplomat.com/feed/",
        "reliability": 0.82,
    },
    # ── Tier 4: Official/institutional ──
    {
        "name": "IAEA News",
        "url": "https://www.iaea.org/feeds/news",
        "reliability": 0.95,
        "official": True,
    },
    {
        "name": "UN News",
        "url": "https://news.un.org/feed/subscribe/en/news/region/middle-east/feed/rss.xml",
        "reliability": 0.92,
        "official": True,
    },
    {
        "name": "US State Dept",
        "url": "https://www.state.gov/rss-feed/press-releases/feed/",
        "reliability": 0.90,
        "official": True,
    },
    {
        "name": "Reuters World via Google",
        "url": "https://news.google.com/rss/search?q=reuters+middle+east+iran&hl=en&gl=US&ceid=US:en",
        "reliability": 0.90,
    },
]


class RSSClient:
    """Async RSS/Atom feed aggregator for georisk news sources."""

    def __init__(
        self,
        feeds: Optional[list[dict]] = None,
        timeout: float = 15.0,
    ):
        self.feeds = feeds or DEFAULT_FEEDS
        self.client = httpx.AsyncClient(
            timeout=timeout, follow_redirects=True
        )

    async def fetch_all(self) -> list[dict]:
        """Fetch and parse every configured feed, returning a flat list of items."""
        all_items: list[dict] = []
        for feed_info in self.feeds:
            try:
                items = await self._fetch_feed(feed_info)
                all_items.extend(items)
            except Exception as e:
                logger.warning(
                    "rss_feed_error",
                    feed=feed_info["name"],
                    error=str(e),
                )
        logger.info("rss_fetch_complete", total=len(all_items))
        return all_items

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=10),
    )
    async def _fetch_feed(self, feed_info: dict) -> list[dict]:
        resp = await self.client.get(feed_info["url"])
        resp.raise_for_status()

        parsed = feedparser.parse(resp.text)
        items: list[dict] = []

        for entry in parsed.entries:
            pub_date: datetime
            if (
                hasattr(entry, "published_parsed")
                and entry.published_parsed
            ):
                try:
                    pub_date = datetime(
                        *entry.published_parsed[:6], tzinfo=timezone.utc
                    )
                except Exception:
                    pub_date = datetime.now(timezone.utc)
            else:
                pub_date = datetime.now(timezone.utc)

            items.append(
                {
                    "title": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "source_name": feed_info["name"],
                    "published_at": pub_date.isoformat(),
                    "summary": (
                        entry.get("summary", "")
                        or entry.get("description", "")
                        or ""
                    ),
                    "reliability": feed_info.get("reliability", 0.7),
                    "official": feed_info.get("official", False),
                }
            )

        return items

    async def close(self) -> None:
        await self.client.aclose()
