"""Nuclear Opacity Index (NOI) calculator.

Methodology based on NTI Nuclear Security Index (Nuclear Threat Initiative, 2020-2024)
and IAEA safeguards assessment framework.

The NOI measures how opaque Iran's nuclear program is to international verification.
Higher values mean less transparency and greater uncertainty about nuclear activities.

Components and weights (adapted from NTI Nuclear Security Index categories):
  NOTE: The weight allocation (A+B = 50%, C+D+E+F = 50%) reflects an expert
  judgment that physical verification (access + materials) is the most critical
  dimension of nuclear opacity. This is not derived from a specific NTI formula
  but from the authors' assessment of IAEA safeguards priorities.

  A = site_access_loss (25%) — IAEA physical access to declared sites
      Reference: NTI "Security and Control Measures" category
  B = material_knowledge_loss (25%) — Knowledge of nuclear material quantities/locations
      Reference: NTI "Quantities and Sites" category
  C = enrichment_verification_gap (20%) — Verification of enrichment levels
      Reference: IAEA Safeguards Implementation Report, enrichment monitoring
  D = underground_activity_signal (10%) — Activity at hardened/underground sites
      Reference: IAEA reports on Fordow enrichment facility
  E = technical_diplomatic_breakdown (10%) — Breakdown in technical cooperation with IAEA
      Reference: NTI "Global Norms" category
  F = conflicting_narratives_uncertainty (10%) — Contradictory claims about program status
      Reference: Information uncertainty metric, standard in intelligence analysis

Hard rules (threshold effects based on historical precedents):
  - If A >= 75 and B >= 90 => NOI floor = 80
    Rationale: Complete loss of access + material knowledge = near-total opacity
    Historical precedent: North Korea pre-2006 test
  - If C >= 75 and D >= 50 => NOI += 5
    Rationale: High enrichment gap + underground activity = compounding risk
  - If E >= 80 and F >= 70 => NOI += 3
    Rationale: Diplomatic breakdown + narrative confusion = additional uncertainty

Thresholds (aligned with IAEA safeguards conclusion categories):
  0-24  Green     — Broader Conclusion (all material accounted for)
  25-49 Yellow    — Partial verification gaps
  50-69 Orange    — Significant verification gaps
  70-84 Red       — Unable to verify peaceful nature
  85-100 Dark Red — Near-complete opacity

References:
  - NTI Nuclear Security Index: https://www.ntiindex.org/
  - IAEA Safeguards Implementation Reports (GOV/year series)
  - Albright, D. & Burkhard, S. (2021). "Iran's Nuclear Program: Status and Uncertainties"
"""


def compute_noi(components: dict) -> dict:
    """Compute NOI from component values.

    Args:
        components: dict with keys A-F (site_access_loss, material_knowledge_loss, etc.)
                   Each value 0-100.

    Returns:
        dict with 'noi', 'components', 'level', 'hard_rules_fired'
    """
    A = float(components.get("site_access_loss", 0))
    B = float(components.get("material_knowledge_loss", 0))
    C = float(components.get("enrichment_verification_gap", 0))
    D = float(components.get("underground_activity_signal", 0))
    E = float(components.get("technical_diplomatic_breakdown", 0))
    F = float(components.get("conflicting_narratives_uncertainty", 0))

    # Clamp inputs
    A, B, C, D, E, F = [max(0, min(100, x)) for x in [A, B, C, D, E, F]]

    # Weighted sum (NTI-derived weights)
    noi = 0.25 * A + 0.25 * B + 0.20 * C + 0.10 * D + 0.10 * E + 0.10 * F

    hard_rules = []

    # Hard rule 1: Complete access + material loss => near-total opacity
    if A >= 75 and B >= 90:
        noi = max(noi, 80)
        hard_rules.append("A>=75_AND_B>=90_MIN_80")

    # Hard rule 2: Enrichment gap + underground activity => compounding
    if C >= 75 and D >= 50:
        noi += 5
        hard_rules.append("C>=75_AND_D>=50_PLUS_5")

    # Hard rule 3: Diplomatic breakdown + conflicting narratives
    if E >= 80 and F >= 70:
        noi += 3
        hard_rules.append("E>=80_AND_F>=70_PLUS_3")

    # Final clamp
    noi = max(0, min(100, noi))

    # Determine level (aligned with IAEA safeguards conclusions)
    if noi < 25:
        level = "green"
    elif noi < 50:
        level = "yellow"
    elif noi < 70:
        level = "orange"
    elif noi < 85:
        level = "red"
    else:
        level = "dark_red"

    return {
        "noi": round(noi, 2),
        "components": {
            "site_access_loss": A,
            "material_knowledge_loss": B,
            "enrichment_verification_gap": C,
            "underground_activity_signal": D,
            "technical_diplomatic_breakdown": E,
            "conflicting_narratives_uncertainty": F,
        },
        "level": level,
        "hard_rules_fired": hard_rules,
    }
