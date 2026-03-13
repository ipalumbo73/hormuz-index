import re
import structlog

logger = structlog.get_logger()



# Geographic relevance filter — only events mentioning these terms are scored for Gulf/Iran crisis
RELEVANT_GEO_PATTERNS = re.compile(
    r"iran|israel|hezbollah|houthi|tehran|beirut|gaza|lebanon|gulf|hormuz|"
    r"arabia|saudi|qatar|bahrain|iraq|yemen|syria|middle\s*east|"
    r"natanz|fordow|isfahan|iaea|irgc|centrifuge|enrichment|nuclear|"
    r"proxy|azerbijan|strait|ayatollah|khamenei|netanyahu|pentagon|trump|"
    r"us\s+(?:strike|bomb|attack|force)|american\s+(?:strike|bomb|attack)",
    re.IGNORECASE,
)

CATEGORY_RULES = [
    {
        "category": "nuclear_transfer_signal",
        "patterns": [
            # Tightened patterns to avoid false positives from oil/sanctions news
            # mentioning "Russia", "nuclear", and "Iran" in unrelated contexts.
            # Now require explicit transfer/proliferation verbs near nuclear terms.
            r"(?:russia|china|moscow|beijing).{0,40}(?:transfer|supply|provide|deliver|share|give).{0,30}(?:nuclear|warhead|weapon).{0,30}(?:iran|tehran)",
            r"(?:iran|tehran).{0,30}(?:receive|obtain|acquire).{0,30}(?:nuclear\s+(?:warhead|weapon|device|bomb|material))",
            r"nuclear\s+(?:proliferation|transfer|sharing).{0,30}(?:iran|tehran)",
            r"(?:russia|china).{0,30}(?:sell|export|hand\s*over).{0,30}(?:nuclear\s+(?:warhead|weapon|device|technology))",
        ],
        "signal_keys": ["BSI", "SRI"],
        "base_severity": 0.80,
        "requires_geo": False,
    },
    {
        "category": "nuclear_posture_signal",
        "patterns": [
            r"nuclear\s+(?:option|response|retaliation|strike|attack|first.strike|warning|posture)",
            r"tactical\s+nuclear", r"nuclear\s+deterren", r"nuclear\s+threat",
            r"nuclear\s+(?:capable|armed)\s+(?:missile|warhead|weapon|bomb|submarine)",
            r"(?:use|deploy|consider)\s+nuclear", r"nuclear.*last\s+resort",
            r"samson\s+option", r"nuclear\s+umbrella.*(?:withdraw|question)",
            r"(?:b-?61|trident|jericho).*(?:deploy|ready|alert)",
        ],
        "signal_keys": ["SRI", "BSI"],
        "base_severity": 0.75,
        "requires_geo": False,
    },
    {
        "category": "nuclear_verification_gap",
        "patterns": [r"iaea.*cannot\s+verify", r"iaea.*no\s+access", r"verification.*gap", r"inspectors.*denied", r"monitoring.*suspended", r"safeguards.*agreement"],
        "signal_keys": ["NOI_A_site_access_loss", "NOI_B_material_knowledge_loss", "NOI_C_enrichment_verification_gap"],
        "base_severity": 0.70,
        "requires_geo": False,
    },
    {
        "category": "enrichment_signal",
        "patterns": [r"enrichment.*90", r"enrichment.*60", r"enrichment.*weapons?.grade", r"highly\s+enriched", r"heu\b", r"uranium.*enrich"],
        "signal_keys": ["NOI_C_enrichment_verification_gap", "BSI"],
        "base_severity": 0.65,
        "requires_geo": False,
    },
    {
        "category": "underground_activity_signal",
        "patterns": [r"underground.*facility", r"fordow.*activity", r"tunnel", r"bunker.*nuclear", r"buried.*centrifuge"],
        "signal_keys": ["NOI_D_underground_activity_signal", "BSI"],
        "base_severity": 0.75,
        "requires_geo": False,
    },
    {
        "category": "military_strike",
        "patterns": [r"air\s*strike", r"bomb(?:ing|ed)", r"missile\s+strike", r"military\s+attack", r"targeted\s+kill"],
        "signal_keys": ["GAI", "PAI"],
        "base_severity": 0.75,
        "requires_geo": True,
    },
    {
        "category": "missile_drone_attack",
        "patterns": [r"missile\s+(?:attack|launch|fired)", r"drone\s+(?:attack|strike)", r"ballistic\s+missile", r"cruise\s+missile", r"uav\s+attack"],
        "signal_keys": ["GAI", "PAI"],
        "base_severity": 0.72,
        "requires_geo": True,
    },
    {
        "category": "proxy_activity",
        "patterns": [r"hezbollah.*(?:attack|fire|rocket|launch)", r"houthi.*(?:attack|missile|drone|ship)", r"militia.*(?:attack|rocket|mortar)", r"proxy.*(?:attack|strike)"],
        "signal_keys": ["PAI"],
        "base_severity": 0.75,
        "requires_geo": False,
    },
    {
        "category": "gulf_infrastructure_attack",
        "patterns": [r"oil\s+facility.*attack", r"aramco.*attack", r"refinery.*(?:attack|strike|damage)", r"pipeline.*(?:attack|sabotage)", r"port.*(?:attack|strike)"],
        "signal_keys": ["GAI"],
        "base_severity": 0.70,
        "requires_geo": True,
    },
    {
        "category": "shipping_disruption",
        "patterns": [r"shipping.*(?:attack|disrupt)", r"tanker.*(?:attack|seize)", r"cargo\s+ship.*(?:attack|hit)", r"maritime.*(?:threat|incident)", r"red\s+sea.*(?:attack|shipping)"],
        "signal_keys": ["HDI"],
        "base_severity": 0.78,
        "requires_geo": True,
    },
    {
        "category": "hormuz_threat",
        "patterns": [r"hormuz.*(?:close|block|mine|threat|disrupt)", r"strait.*(?:close|block|mine)", r"hormuz.*(?:naval|military)", r"hormuz.*escort"],
        "signal_keys": ["HDI"],
        "base_severity": 0.72,
        "requires_geo": False,
    },
    {
        "category": "nuclear_site_damage",
        "patterns": [r"(?:natanz|fordow|isfahan).*(?:attack|strike|damage|explosion|sabotage)", r"nuclear.*(?:site|facility).*(?:attack|damage|strike)"],
        "signal_keys": ["NOI_A_site_access_loss", "GAI"],
        "base_severity": 0.80,
        "requires_geo": False,
    },
    {
        "category": "strategic_rhetoric",
        "patterns": [r"existential\s+threat", r"last\s+(?:resort|window)", r"no\s+option.*excluded", r"all\s+options.*table", r"red\s+line", r"devastating\s+consequences", r"unconditional\s+surrender", r"regime\s+change"],
        "signal_keys": ["SRI"],
        "base_severity": 0.70,
        "requires_geo": True,
    },
    {
        "category": "diplomatic_contact",
        "patterns": [r"talks?\s+(?:resume|begin|start)", r"diplomatic.*(?:channel|contact|meeting)", r"negotiat", r"oman.*(?:mediat|talks?|channel)", r"hotline", r"ceasefire.*(?:agree|propose)"],
        "signal_keys": ["DCI"],
        "base_severity": 0.60,
        "requires_geo": True,
    },
    {
        "category": "deescalation_signal",
        "patterns": [r"de.?escalat", r"pause.*(?:strike|attack|raid)", r"truce", r"peace.*(?:talk|deal|proposal)", r"withdraw.*(?:force|troop)", r"stand.*down"],
        "signal_keys": ["DCI"],
        "base_severity": 0.55,
        "requires_geo": True,
    },
    {
        "category": "sanctions_or_economic_pressure",
        "patterns": [r"sanction", r"economic.*pressure", r"trade.*(?:ban|restrict)", r"asset.*freez", r"oil.*embargo"],
        "signal_keys": ["SRI"],
        "base_severity": 0.55,
        "requires_geo": True,
    },
    {
        "category": "cyber_operation",
        "patterns": [r"cyber.*(?:attack|operation|warfare)", r"hack(?:ed|ing)", r"stuxnet", r"cyber.*(?:iran|israel|infrastructure)"],
        "signal_keys": ["GAI"],
        "base_severity": 0.65,
        "requires_geo": True,
    },
    {
        "category": "civilian_casualty_mass_event",
        "patterns": [r"civilian.*(?:casualt|killed|dead|death)", r"mass.*(?:casualt|atroci)", r"humanitarian.*crisis"],
        "signal_keys": ["PAI", "SRI"],
        "base_severity": 0.80,
        "requires_geo": True,
    },
]

def classify_event(title: str, summary: str = "") -> dict:
    """Classify an event based on title and summary text using rule-based matching.
    Returns: {category, signal_keys, severity, confidence, explanation}
    """
    text = f"{title} {summary}".lower()

    # Check geographic relevance to Iran/Gulf/Middle East crisis
    is_geo_relevant = bool(RELEVANT_GEO_PATTERNS.search(text))

    best_match = None
    best_score = 0
    matches_found = []

    for rule in CATEGORY_RULES:
        # Skip rules requiring geographic relevance if event is not relevant
        if rule.get("requires_geo", False) and not is_geo_relevant:
            continue

        match_count = 0
        matched_patterns = []
        for pattern in rule["patterns"]:
            if re.search(pattern, text):
                match_count += 1
                matched_patterns.append(pattern)

        if match_count > 0:
            score = match_count / len(rule["patterns"])
            matches_found.append({
                "category": rule["category"],
                "score": score,
                "severity": rule["base_severity"],
                "signal_keys": rule["signal_keys"],
                "matched_patterns": matched_patterns,
            })
            if score > best_score:
                best_score = score
                best_match = rule

    if not best_match:
        return {
            "category": "unclassified",
            "signal_keys": [],
            "severity": 0.3,
            "confidence": 0.1,
            "explanation": "No classification rules matched." + ("" if is_geo_relevant else " Event not geographically relevant to Iran/Gulf crisis."),
            "secondary_categories": [],
        }

    # Confidence based on how many patterns matched
    confidence = min(0.95, 0.4 + best_score * 0.5)

    # Build signal payload
    signal_payload = {}
    for key in best_match["signal_keys"]:
        signal_payload[key] = int(best_match["base_severity"] * 100)

    secondary = [m["category"] for m in matches_found if m["category"] != best_match["category"]]

    return {
        "category": best_match["category"],
        "signal_keys": best_match["signal_keys"],
        "signal_payload": signal_payload,
        "severity": best_match["base_severity"],
        "confidence": confidence,
        "explanation": f"Matched {len([p for p in best_match['patterns'] if re.search(p, text)])} patterns for {best_match['category']}",
        "secondary_categories": secondary[:3],
    }
