import csv
import io
import zipfile
from datetime import datetime, timezone
from typing import Optional

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

logger = structlog.get_logger()

GDELT_LATEST_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt"

RELEVANT_COUNTRY_CODES = {
    "IRN", "ISR", "USA", "SAU", "ARE", "BHR",
    "QAT", "KWT", "OMN", "IRQ", "SYR", "LBN",
    "YEM", "RUS", "CHN",
}

RELEVANT_CAMEO_ROOTS = {
    "04", "05", "06",   # diplomacy / cooperation
    "14",                # protest
    "17", "18", "19",   # coerce, assault, fight
}

ACTOR_NAMES = {
    "IRN": "Iran",
    "ISR": "Israel",
    "USA": "United States",
    "SAU": "Saudi Arabia",
    "ARE": "UAE",
    "BHR": "Bahrain",
    "QAT": "Qatar",
    "KWT": "Kuwait",
    "OMN": "Oman",
    "IRQ": "Iraq",
    "SYR": "Syria",
    "LBN": "Lebanon",
    "YEM": "Yemen",
    "RUS": "Russia",
    "CHN": "China",
}


class GDELTClient:
    """Client for fetching and parsing events from the GDELT 2.0 Events database."""

    def __init__(self, timeout: float = 30.0):
        self.client = httpx.AsyncClient(timeout=timeout)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
    )
    async def fetch_latest(self) -> list[dict]:
        """Fetch the latest GDELT export, filter for relevant countries and CAMEO codes."""
        logger.info("gdelt_fetch_start")

        # Step 1: resolve the latest export URL from the update manifest
        resp = await self.client.get(GDELT_LATEST_URL)
        resp.raise_for_status()

        export_url: Optional[str] = None
        for line in resp.text.strip().split("\n"):
            parts = line.strip().split(" ")
            if len(parts) >= 3 and "export" in parts[2].lower():
                export_url = parts[2]
                break

        if not export_url:
            logger.warning("gdelt_no_export_url")
            return []

        # Step 2: download the zipped CSV
        resp2 = await self.client.get(export_url)
        resp2.raise_for_status()

        zf = zipfile.ZipFile(io.BytesIO(resp2.content))
        csv_name = zf.namelist()[0]
        csv_data = zf.read(csv_name).decode("utf-8", errors="replace")

        return self._parse_events(csv_data)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _parse_events(self, csv_data: str) -> list[dict]:
        """Parse tab-separated GDELT export rows into filtered event dicts."""
        results: list[dict] = []
        reader = csv.reader(io.StringIO(csv_data), delimiter="\t")

        for row in reader:
            try:
                if len(row) < 58:
                    continue

                actor1_country = row[7] if len(row) > 7 else ""
                actor2_country = row[17] if len(row) > 17 else ""
                cameo_code = row[26] if len(row) > 26 else ""
                cameo_root = row[27] if len(row) > 27 else ""

                # --- country filter ---
                countries_found: set[str] = set()
                if actor1_country in RELEVANT_COUNTRY_CODES:
                    countries_found.add(actor1_country)
                if actor2_country in RELEVANT_COUNTRY_CODES:
                    countries_found.add(actor2_country)

                if not countries_found:
                    continue

                # --- CAMEO root filter (optional tightening) ---
                # When the root code is available we only keep conflict/diplomacy
                if cameo_root and cameo_root not in RELEVANT_CAMEO_ROOTS:
                    continue

                # --- numeric fields ---
                goldstein = float(row[30]) if row[30] else 0.0
                num_mentions = int(row[31]) if row[31] else 1
                num_sources = int(row[32]) if row[32] else 1

                # --- actor names ---
                actor1_name = row[6] if len(row) > 6 else ""
                actor2_name = row[16] if len(row) > 16 else ""
                source_url = row[57] if len(row) > 57 else ""

                # --- date ---
                date_str = row[1] if len(row) > 1 else ""
                try:
                    published = datetime.strptime(date_str, "%Y%m%d").replace(
                        tzinfo=timezone.utc
                    )
                except (ValueError, IndexError):
                    published = datetime.now(timezone.utc)

                actors = [
                    ACTOR_NAMES[cc] for cc in countries_found if cc in ACTOR_NAMES
                ]

                action_geo = row[56] if len(row) > 56 else ""

                results.append(
                    {
                        "title": f"{actor1_name} - {actor2_name}: {cameo_code}",
                        "url": source_url,
                        "source_name": "GDELT",
                        "published_at": published.isoformat(),
                        "actors": actors,
                        "countries": [
                            ACTOR_NAMES.get(c, c) for c in countries_found
                        ],
                        "locations": [action_geo] if action_geo else [],
                        "cameo_code": cameo_code,
                        "cameo_root": cameo_root,
                        "goldstein_scale": goldstein,
                        "num_mentions": num_mentions,
                        "num_sources": num_sources,
                    }
                )
            except Exception as e:
                logger.warning("gdelt_row_parse_error", error=str(e))
                continue

        logger.info("gdelt_fetch_complete", event_count=len(results))
        return results

    async def close(self) -> None:
        await self.client.aclose()
