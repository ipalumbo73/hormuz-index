import re
from typing import Optional
import structlog

logger = structlog.get_logger()

ACTOR_PATTERNS = {
    "Iran": [r"\biran\b", r"\btehran\b", r"\birgc\b", r"\bkhamenei\b", r"\braisi\b", r"\bpezeshkian\b"],
    "Israel": [r"\bisrael\b", r"\bidf\b", r"\bnetanyahu\b", r"\btel\s*aviv\b", r"\bmossad\b"],
    "United States": [r"\bunited\s+states\b", r"\busa\b", r"\bu\.s\.\b", r"\bpentagon\b", r"\bwhite\s+house\b", r"\bcentcom\b", r"\bbiden\b", r"\btrump\b"],
    "IAEA": [r"\biaea\b", r"\binternational\s+atomic\b", r"\bgrossi\b"],
    "Saudi Arabia": [r"\bsaudi\b", r"\briyadh\b", r"\bmbs\b"],
    "UAE": [r"\buae\b", r"\bemirati\b", r"\babu\s+dhabi\b", r"\bdubai\b"],
    "Bahrain": [r"\bbahrain\b", r"\bmanama\b"],
    "Qatar": [r"\bqatar\b", r"\bdoha\b"],
    "Kuwait": [r"\bkuwait\b"],
    "Oman": [r"\boman\b", r"\bmuscat\b"],
    "Iraq": [r"\biraq\b", r"\bbaghdad\b"],
    "Syria": [r"\bsyria\b", r"\bdamascus\b", r"\bassad\b"],
    "Lebanon": [r"\blebanon\b", r"\bbeirut\b"],
    "Hezbollah": [r"\bhezbollah\b", r"\bhizbollah\b", r"\bnasrallah\b"],
    "Houthis": [r"\bhouthi\b", r"\bansar\s+allah\b"],
    "Iraqi militias": [r"\biraq\w*\s+militia\b", r"\bpmu\b", r"\bhashd\b", r"\bkataib\b"],
    "Russia": [r"\brussia\b", r"\bmoscow\b", r"\bkremlin\b", r"\bputin\b"],
    "China": [r"\bchina\b", r"\bbeijing\b", r"\bchinese\b"],
    "EU / E3": [r"\beuropean\s+union\b", r"\beu\b", r"\be3\b", r"\bbrussels\b"],
}

LOCATION_PATTERNS = {
    "Natanz": [r"\bnatanz\b"],
    "Fordow": [r"\bfordow\b", r"\bfordo\b"],
    "Isfahan": [r"\bisfahan\b", r"\besfahan\b"],
    "Tehran": [r"\btehran\b"],
    "Strait of Hormuz": [r"\bhormuz\b"],
    "Gulf of Oman": [r"\bgulf\s+of\s+oman\b"],
    "Red Sea": [r"\bred\s+sea\b"],
    "Yemen": [r"\byemen\b", r"\bsanaa\b", r"\bhodeidah\b"],
    "Bahrain": [r"\bbahrain\b"],
    "Qatar": [r"\bqatar\b"],
    "UAE": [r"\buae\b", r"\babu\s+dhabi\b"],
    "Saudi oil hubs": [r"\bras\s+tanura\b", r"\babqaiq\b", r"\bramco\b", r"\baramco\b"],
    "Iraq-Syria corridor": [r"\biraq.syria\s+corridor\b", r"\bal.bukamal\b"],
    "Lebanon border": [r"\blebanon\s+border\b", r"\bblue\s+line\b"],
}

COUNTRY_MAPPING = {
    "Iran": "Iran", "Israel": "Israel", "United States": "USA",
    "IAEA": "International", "Saudi Arabia": "Saudi Arabia",
    "UAE": "UAE", "Bahrain": "Bahrain", "Qatar": "Qatar",
    "Kuwait": "Kuwait", "Oman": "Oman", "Iraq": "Iraq",
    "Syria": "Syria", "Lebanon": "Lebanon", "Russia": "Russia",
    "China": "China", "Hezbollah": "Lebanon", "Houthis": "Yemen",
    "Iraqi militias": "Iraq", "EU / E3": "EU",
}


def extract_entities(text: str) -> dict:
    """Extract actors, countries, and locations from text."""
    text_lower = text.lower()

    actors = []
    for actor, patterns in ACTOR_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                actors.append(actor)
                break

    countries = list(set(COUNTRY_MAPPING.get(a, "") for a in actors if a in COUNTRY_MAPPING))
    countries = [c for c in countries if c]

    locations = []
    for loc, patterns in LOCATION_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                locations.append(loc)
                break

    return {
        "actor_tags": actors,
        "country_tags": countries,
        "location_tags": locations,
    }
