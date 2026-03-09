import re
from typing import Optional
import structlog

logger = structlog.get_logger()

ACTOR_PATTERNS = {
    "Iran": [r"\biran\b", r"\btehran\b", r"\birgc\b", r"\bkhamenei\b", r"\braisi\b", r"\bpezeshkian\b", r"\bjalili\b", r"\bqalibaf\b", r"\bzarif\b", r"\brouhani\b"],
    "Israel": [r"\bisrael\b", r"\bidf\b", r"\bnetanyahu\b", r"\btel\s*aviv\b", r"\bmossad\b", r"\bshin\s+bet\b", r"\bgallant\b", r"\bgantz\b", r"\bknesset\b", r"\bsmotrich\b", r"\bben\s+gvir\b"],
    "United States": [r"\bunited\s+states\b", r"\busa\b", r"\bu\.s\.\b", r"\bpentagon\b", r"\bwhite\s+house\b", r"\bcentcom\b", r"\bbiden\b", r"\btrump\b", r"\bstate\s+department\b", r"\baustin\b", r"\bblinken\b", r"\bsullivan\b"],
    "IAEA": [r"\biaea\b", r"\binternational\s+atomic\b", r"\bgrossi\b"],
    "Saudi Arabia": [r"\bsaudi\b", r"\briyadh\b", r"\bmbs\b", r"\bbin\s+salman\b", r"\baramco\b"],
    "UAE": [r"\buae\b", r"\bemirati\b", r"\babu\s+dhabi\b", r"\bdubai\b"],
    "Bahrain": [r"\bbahrain\b", r"\bmanama\b"],
    "Qatar": [r"\bqatar\b", r"\bdoha\b"],
    "Kuwait": [r"\bkuwait\b"],
    "Oman": [r"\boman\b", r"\bmuscat\b"],
    "Iraq": [r"\biraq\b", r"\bbaghdad\b"],
    "Syria": [r"\bsyria\b", r"\bdamascus\b", r"\bassad\b", r"\bhts\b", r"\bjolani\b"],
    "Lebanon": [r"\blebanon\b", r"\bbeirut\b"],
    "Hezbollah": [r"\bhezbollah\b", r"\bhizbollah\b", r"\bnasrallah\b"],
    "Houthis": [r"\bhouthi\b", r"\bansar\s+allah\b"],
    "Iraqi militias": [r"\biraq\w*\s+militia\b", r"\bpmu\b", r"\bhashd\b", r"\bkataib\b"],
    "Hamas": [r"\bhamas\b", r"\bsinwar\b", r"\bhaniyeh\b"],
    "PIJ": [r"\bislamic\s+jihad\b", r"\bpij\b"],
    "Russia": [r"\brussia\b", r"\bmoscow\b", r"\bkremlin\b", r"\bputin\b"],
    "China": [r"\bchina\b", r"\bbeijing\b", r"\bchinese\b"],
    "EU / E3": [r"\beuropean\s+union\b", r"\b(?:the\s+)?eu\b", r"\be3\b", r"\bbrussels\b"],
    "Turkey": [r"\bturk(?:ey|iye)\b", r"\bankara\b", r"\berdogan\b"],
    "Egypt": [r"\begypt\b", r"\bcairo\b", r"\bsisi\b"],
    "Jordan": [r"\bjordan\b", r"\bamman\b"],
    "Pakistan": [r"\bpakistan\b", r"\bislamabad\b"],
}

LOCATION_PATTERNS = {
    # --- Iran Nuclear Sites ---
    "Natanz": [r"\bnatanz\b"],
    "Fordow": [r"\bfordow\b", r"\bfordo\b"],
    "Isfahan": [r"\bisfahan\b", r"\besfahan\b"],
    "Bushehr": [r"\bbushehr\b"],
    "Arak": [r"\barak\s+(?:reactor|heavy|ir)\b", r"\barak\s+nuclear\b"],
    "Parchin": [r"\bparchin\b"],
    "Tehran": [r"\btehran\b"],
    "Tabriz": [r"\btabriz\b"],
    "Shiraz": [r"\bshiraz\b"],
    "Mashhad": [r"\bmashhad\b"],
    "Bandar Abbas": [r"\bbandar\s+abbas\b"],
    "Chabahar": [r"\bchabahar\b"],
    "Kharg Island": [r"\bkharg\b"],
    "Abadan": [r"\babadan\b"],
    "Ahvaz": [r"\bahvaz\b"],
    "Kerman": [r"\bkerman\b"],
    "Qom": [r"\bqom\b"],
    # --- Israel ---
    "Dimona": [r"\bdimona\b"],
    "Tel Aviv": [r"\btel\s+aviv\b"],
    "Jerusalem": [r"\bjerusalem\b"],
    "Haifa": [r"\bhaifa\b"],
    "Beer Sheva": [r"\bbeer\s+sheva\b", r"\bbe'?er\s+sheva\b"],
    "Eilat": [r"\beilat\b"],
    "Ashkelon": [r"\bashkelon\b"],
    "Sderot": [r"\bsderot\b"],
    "Golan Heights": [r"\bgolan\b"],
    "Negev": [r"\bnegev\b"],
    "Kiryat Shmona": [r"\bkiryat\s+shmona\b"],
    "Metula": [r"\bmetula\b"],
    "Nahariya": [r"\bnahariya\b"],
    "Tiberias": [r"\btiberias\b"],
    # --- Gaza / West Bank ---
    "Gaza": [r"\bgaza\b"],
    "Rafah": [r"\brafah\b"],
    "Khan Younis": [r"\bkhan\s+you?nis\b"],
    "Jabalia": [r"\bjabalia\b"],
    "Nablus": [r"\bnablus\b"],
    "Jenin": [r"\bjenin\b"],
    "Ramallah": [r"\bramallah\b"],
    "Hebron": [r"\bhebron\b"],
    "Tulkarm": [r"\btulkarm\b"],
    "Deir al-Balah": [r"\bdeir\s+al.balah\b"],
    # --- Lebanon ---
    "Beirut": [r"\bbeirut\b"],
    "Tyre": [r"\btyre\b"],
    "Sidon": [r"\bsidon\b"],
    "Baalbek": [r"\bbaalbek\b"],
    "Tripoli Lebanon": [r"\btripoli\b(?=.*lebanon)"],
    "Dahiyeh": [r"\bdahiy[ae]h?\b"],
    "Litani River": [r"\blitani\b"],
    "Nabatieh": [r"\bnabatieh\b"],
    "Lebanon border": [r"\blebanon\s+border\b", r"\bblue\s+line\b"],
    # --- Syria ---
    "Damascus": [r"\bdamascus\b"],
    "Aleppo": [r"\baleppo\b"],
    "Homs": [r"\bhoms\b"],
    "Latakia": [r"\blatakia\b"],
    "Deir ez-Zor": [r"\bdeir\s+(?:ez.?)?zor\b"],
    "Idlib": [r"\bidlib\b"],
    "Daraa": [r"\bdaraa\b", r"\bdera'?a\b"],
    "Raqqa": [r"\braqqa\b"],
    "Tartus": [r"\btartus\b"],
    "T4 Air Base": [r"\bt-?4\s+(?:air)?base\b", r"\btiyas\b"],
    "Al-Bukamal": [r"\bal.?bukamal\b", r"\babu\s+kamal\b"],
    "Iraq-Syria corridor": [r"\biraq.syria\s+corridor\b", r"\bal.bukamal\b"],
    # --- Iraq ---
    "Baghdad": [r"\bbaghdad\b"],
    "Basra": [r"\bbasra\b"],
    "Erbil": [r"\berbil\b", r"\birbil\b"],
    "Mosul": [r"\bmosul\b"],
    "Kirkuk": [r"\bkirkuk\b"],
    "Sulaymaniyah": [r"\bsulaymaniyah\b"],
    "Tikrit": [r"\btikrit\b"],
    "Fallujah": [r"\bfallujah\b"],
    "Karbala": [r"\bkarbala\b"],
    "Najaf": [r"\bnajaf\b"],
    "Ain al-Asad": [r"\bain\s+al.asad\b", r"\bal.asad\s+air\b"],
    "Green Zone": [r"\bgreen\s+zone\b"],
    # --- Yemen ---
    "Sanaa": [r"\bsanaa\b", r"\bsana'?a\b"],
    "Aden": [r"\baden\b"],
    "Hodeidah": [r"\bhodeidah\b", r"\bhudaydah\b"],
    "Marib": [r"\bmarib\b"],
    "Taiz": [r"\btaiz\b"],
    "Mocha": [r"\bmocha\b", r"\bal.?mokha\b"],
    # --- Saudi Arabia ---
    "Riyadh": [r"\briyadh\b"],
    "Jeddah": [r"\bjeddah\b", r"\bjidda\b"],
    "Dhahran": [r"\bdhahran\b"],
    "Abqaiq": [r"\babqaiq\b"],
    "Yanbu": [r"\byanbu\b"],
    "Ras Tanura": [r"\bras\s+tanura\b"],
    "NEOM": [r"\bneom\b"],
    "Saudi oil hubs": [r"\bras\s+tanura\b", r"\babqaiq\b", r"\bramco\b", r"\baramco\b"],
    # --- Strategic waterways ---
    "Strait of Hormuz": [r"\bhormuz\b"],
    "Bab el-Mandeb": [r"\bbab\s+el.?mandeb\b"],
    "Suez Canal": [r"\bsuez\b"],
    "Gulf of Oman": [r"\bgulf\s+of\s+oman\b"],
    "Red Sea": [r"\bred\s+sea\b"],
    "Persian Gulf": [r"\bpersian\s+gulf\b", r"\barabian\s+gulf\b"],
    "Arabian Sea": [r"\barabian\s+sea\b"],
    "Gulf of Aden": [r"\bgulf\s+of\s+aden\b"],
    "Mediterranean": [r"\bmediterranean\b"],
    # --- US military bases ---
    "Al Udeid": [r"\bal\s+udeid\b"],
    "Al Dhafra": [r"\bal\s+dhafra\b"],
    "Camp Arifjan": [r"\bcamp\s+arifjan\b", r"\barifjan\b"],
    "Incirlik": [r"\bincirlik\b"],
    "Diego Garcia": [r"\bdiego\s+garcia\b"],
    # --- Diplomatic centers ---
    "Vienna": [r"\bvienna\b"],
    "Washington": [r"\bwashington\b"],
    "New York UN": [r"\bunited\s+nations\b", r"\bun\s+(?:general|security)\b"],
    # --- Gulf states ---
    "Abu Dhabi": [r"\babu\s+dhabi\b"],
    "Dubai": [r"\bdubai\b"],
    "Doha": [r"\bdoha\b"],
    "Muscat": [r"\bmuscat\b"],
    "Kuwait City": [r"\bkuwait\s+city\b"],
    "Manama": [r"\bmanama\b"],
    # --- Other ---
    "Cairo": [r"\bcairo\b"],
    "Amman": [r"\bamman\b"],
    "Ankara": [r"\bankara\b"],
    "Istanbul": [r"\bistanbul\b"],
    "Sinai": [r"\bsinai\b"],
    "Islamabad": [r"\bislamabad\b"],
}

COUNTRY_MAPPING = {
    "Iran": "Iran", "Israel": "Israel", "United States": "USA",
    "IAEA": "International", "Saudi Arabia": "Saudi Arabia",
    "UAE": "UAE", "Bahrain": "Bahrain", "Qatar": "Qatar",
    "Kuwait": "Kuwait", "Oman": "Oman", "Iraq": "Iraq",
    "Syria": "Syria", "Lebanon": "Lebanon", "Russia": "Russia",
    "China": "China", "Hezbollah": "Lebanon", "Houthis": "Yemen",
    "Iraqi militias": "Iraq", "EU / E3": "EU",
    "Hamas": "Palestine", "PIJ": "Palestine",
    "Turkey": "Turkey", "Egypt": "Egypt", "Jordan": "Jordan",
    "Pakistan": "Pakistan",
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
