"""Scenario probability scoring — additive weighted model with Monte Carlo uncertainty.

Computes relative plausibility for five Iran-Gulf crisis escalation scenarios
using a weighted additive scoring model with literature-informed baseline
scores, a causal weight matrix, trigger conditions, and Monte Carlo
sensitivity analysis for confidence intervals.

Methodology
-----------
- **Baseline scores** are informed by ICG CrisisWatch base-rate data (2003-2024)
  and expert elicitation surveys (GCR Institute 2020, Metaculus). These are NOT
  Bayesian priors in the formal sense — no likelihood function or Bayes' theorem
  is applied. They are initial scores in an additive model, calibrated to
  historical base rates.

- **Weight matrix** uses causal reasoning inspired by the Global Conflict Risk
  Index (GCRI) framework (EU JRC, 2014). Unlike GCRI, which derives weights via
  logistic regression on historical data, our weights are assigned manually
  through causal analysis of the Iran-Gulf crisis dynamics. This is documented
  as an expert judgment, not an empirical derivation.

- **Monte Carlo confidence intervals** follow the global sensitivity analysis
  framework of Saltelli et al. (2004) -- simultaneous perturbation of inputs
  and model weights to quantify output uncertainty.

- **Interpretation**: This model is indicative, not predictive. Probabilities
  represent relative plausibility conditional on current index values and model
  assumptions. They should not be treated as calibrated forecasts.

References
----------
1. International Crisis Group, CrisisWatch Database (2003-2024).
2. EU JRC, Global Conflict Risk Index (GCRI) methodology, 2014.
3. Saltelli, A. et al., "Sensitivity Analysis in Practice", Wiley, 2004.
4. GCR Institute, "Expert Survey on Global Catastrophic Risks", 2020.
5. Metaculus, "Nuclear weapon detonation by 2030" community forecast.
"""

import random
import structlog

logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Scenarios
# ---------------------------------------------------------------------------
SCENARIOS = ["contained", "regional", "threshold", "coercive", "actual"]

# ---------------------------------------------------------------------------
# Baseline Scores (literature-informed initial values)
# ---------------------------------------------------------------------------
# NOTE: These are NOT Bayesian priors in the formal sense. No likelihood
# function or Bayes' theorem is applied. These are starting points for an
# additive scoring model, calibrated to historical base rates from ICG
# CrisisWatch and expert surveys.
PRIORS = {
    # Base case: ~70% of crises remain contained per ICG CrisisWatch data.
    # Set to 55 to reflect that most crises, even severe ones, do not
    # escalate to nuclear dimensions.
    "contained": 55.0,

    # Regional spillover occurs in ~20-30% of serious crises historically.
    "regional": 25.0,

    # Nuclear threshold crises (serious consideration of nuclear dimension)
    # are extremely rare -- a handful of cases in the post-1945 era.
    # Iran does NOT have nuclear weapons; "threshold" tracks proximity to
    # breakout capability, not to actual use.
    "threshold": 12.0,

    # Coercive nuclear signaling has occurred only ~5-7 times since 1945
    # (Berlin 1948, Korea 1953, Taiwan Strait 1954/58, Cuba 1962, Kargil 1999).
    # In this crisis, only USA/Israel could engage in nuclear coercion.
    # Iran cannot coerce with weapons it does not possess.
    "coercive": 5.0,

    # Actual nuclear use: zero instances since 1945. Expert surveys (GCR
    # Institute 2020) place annualized probability at 0.3-1.5%. Prior of 1.0
    # reflects near-zero baseline. In this crisis, actual use can ONLY come
    # from USA/Israel — and the political/strategic cost would be
    # catastrophic, making it the most extreme and unlikely scenario.
    "actual": 1.0,
}

# ---------------------------------------------------------------------------
# Calibrated Weight Matrix
# ---------------------------------------------------------------------------
# Weights encode causal pathways from each composite index to each scenario.
#
# Design principles (derived from GCRI methodology, adapted):
#   - GAI and HDI are the primary drivers of conventional regional war.
#     They carry the highest positive weights for "regional" (+0.30, +0.25).
#   - NOI (nuclear opacity) tracks Iran's nuclear program opacity. Since
#     Iran does NOT have nuclear weapons, NOI drives only "threshold"
#     (approach to capability) and moderately "coercive" (leverage of
#     ambiguity). NOI has ZERO weight on "actual" — Iran cannot use
#     weapons it does not possess.
#   - BSI (breakout signals) is split: it tracks both Iran's path toward
#     a device AND nuclear posture signals from states that already have
#     weapons (USA, Israel). BSI drives "threshold" (+0.30) and is the
#     primary driver of "actual" (+0.08) — because actual use can only
#     come from existing nuclear-armed states or a verified breakout.
#   - SRI (strategic rhetoric) is the leading indicator for coercive
#     nuclear posturing (+0.25 for "coercive"). When USA/Israel use
#     nuclear threats as leverage, SRI captures it. SRI is also the
#     strongest driver of "actual" (+0.10) — rhetoric precedes action.
#   - PAI (proxy activation) feeds into regional war (+0.20) but does not
#     directly cause nuclear escalation.
#   - DCI (diplomatic channels) is the main brake on all escalation
#     scenarios and the only positive driver for "contained" (+0.25).
#   - "Actual" nuclear use is extremely hard to trigger and can only come
#     from: (a) USA/Israel using tactical nuclear weapons, or (b) Iran
#     receiving nuclear devices from Russia/China (tracked by BSI
#     "nuclear_transfer_signal"). NOI is excluded from "actual" because
#     Iran's indigenous program is far from producing a deliverable weapon.
#
WEIGHT_MATRIX = {
    # NOI: Iran's nuclear program opacity. Drives "threshold" (approach to
    # capability) but NOT coercive/actual — Iran cannot threaten or use
    # weapons it does not have.
    "NOI": {"contained": -0.12, "regional": 0.05, "threshold": 0.20, "coercive": 0.08, "actual": 0.00},
    # GAI: conventional military conflict — primary driver of regional war.
    "GAI": {"contained": -0.10, "regional": 0.30, "threshold": 0.03, "coercive": 0.02, "actual": 0.01},
    # HDI: Hormuz disruption — conventional/regional, minimal nuclear link.
    "HDI": {"contained": -0.08, "regional": 0.25, "threshold": 0.04, "coercive": 0.02, "actual": 0.01},
    # PAI: proxy activity — regional driver, no nuclear link.
    "PAI": {"contained": -0.06, "regional": 0.20, "threshold": 0.02, "coercive": 0.01, "actual": 0.00},
    # SRI: strategic rhetoric — can signal nuclear posturing from USA/Israel
    # but rhetoric is far from action. Reduced weight on actual.
    "SRI": {"contained": -0.06, "regional": 0.08, "threshold": 0.12, "coercive": 0.18, "actual": 0.04},
    # BSI: breakout signals — mostly tracks Iran's program (threshold).
    # Heavily reduced on coercive/actual because Iran enriching uranium
    # is NOT the same as nuclear weapons being used. Only nuclear_transfer
    # or posture signals from USA/Israel should drive actual, and those
    # are extremely rare events.
    "BSI": {"contained": -0.08, "regional": 0.03, "threshold": 0.25, "coercive": 0.10, "actual": 0.03},
    # DCI: diplomatic channels — the main brake on escalation.
    "DCI": {"contained":  0.25, "regional": -0.15, "threshold": -0.18, "coercive": -0.15, "actual": -0.10},
}

# ---------------------------------------------------------------------------
# Trigger Conditions
# ---------------------------------------------------------------------------
# Conservative trigger boosts -- require high index convergence and apply
# modest additive adjustments. These represent non-linear escalation dynamics
# that the linear weight matrix cannot capture alone.

TRIGGER_RULES = [
    {
        # Iran's nuclear program becoming opaque + breakout signals
        # => nuclear threshold crisis more likely
        "label": "NOI>=75_AND_BSI>=65_THRESHOLD",
        "condition": lambda idx: idx.get("NOI", 0) >= 75 and idx.get("BSI", 0) >= 65,
        "boost": {"threshold": 5},
    },
    {
        # Extreme rhetoric from nuclear-armed states + high BSI
        # => coercive nuclear posturing (USA/Israel using nuclear leverage)
        "label": "SRI>=75_AND_BSI>=70_COERCIVE",
        "condition": lambda idx: idx.get("SRI", 0) >= 75 and idx.get("BSI", 0) >= 70,
        "boost": {"coercive": 4},
    },
    {
        # Actual nuclear use requires: extreme rhetoric (SRI) + active
        # nuclear posture signals (BSI) + high conventional conflict (GAI)
        # + total diplomatic collapse (DCI very low).
        # NOI is excluded — Iran cannot use weapons it does not have.
        # This trigger represents the most extreme scenario: USA/Israel
        # considering tactical nuclear options with no diplomatic off-ramp.
        # Thresholds set very high — this should almost never fire.
        "label": "SRI>=90_AND_BSI>=90_AND_GAI>=90_AND_DCI<=20_ACTUAL",
        "condition": lambda idx: (
            idx.get("SRI", 0) >= 90
            and idx.get("BSI", 0) >= 90
            and idx.get("GAI", 0) >= 90
            and idx.get("DCI", 0) <= 20
        ),
        "boost": {"actual": 2},
    },
    {
        # TR-5: Nuclear transfer signal (Russia/China → Iran) detected.
        # This is a qualitative game-changer: if Iran receives a nuclear
        # device, the asymmetry assumption (NOI weight=0 on actual) breaks.
        # Boost threshold and actual significantly, and temporarily give
        # NOI influence on actual use scenario.
        # The _nuclear_transfer_active flag is set by score_tasks when
        # a nuclear_transfer_signal event exists in the 24h window.
        "label": "NUCLEAR_TRANSFER_ACTIVE",
        "condition": lambda idx: idx.get("_nuclear_transfer_active", 0) >= 1,
        "boost": {"threshold": 8, "coercive": 6, "actual": 4},
    },
    {
        # Active diplomacy dampens all escalation scenarios
        "label": "DCI>=65_REDUCE_10PCT",
        "condition": lambda idx: idx.get("DCI", 0) >= 65,
        "dampen": {"regional": 0.90, "threshold": 0.90, "coercive": 0.90, "actual": 0.90},
    },
]


# ---------------------------------------------------------------------------
# Core computation (reusable by Monte Carlo)
# ---------------------------------------------------------------------------

def _compute_raw(indices: dict, weight_matrix: dict, priors: dict = None) -> dict:
    """Compute raw scenario scores and normalize to probabilities.

    This is the inner scoring function used by both the public API and the
    Monte Carlo bootstrap. It applies priors, the weight matrix, trigger
    conditions, clamping, and normalization.

    Args:
        indices: dict with index names as keys and float values (0-100).
        weight_matrix: weight matrix (may be perturbed for MC runs).
        priors: base priors dict. Defaults to module-level PRIORS.

    Returns:
        dict mapping each scenario name to its probability (summing to 100).
    """
    base = priors or PRIORS
    scores = {s: base.get(s, PRIORS[s]) for s in SCENARIOS}

    # Apply weight matrix: score += weight * index_value
    for idx_name, weights in weight_matrix.items():
        idx_val = float(indices.get(idx_name, 0))
        for scenario, weight in weights.items():
            scores[scenario] += weight * idx_val

    # Apply trigger rules
    float_indices = {k: float(v) for k, v in indices.items()}
    for rule in TRIGGER_RULES:
        if rule["condition"](float_indices):
            for s, boost in rule.get("boost", {}).items():
                scores[s] += boost
            for s, factor in rule.get("dampen", {}).items():
                scores[s] *= factor

    # Clamp scores to >= 0
    for s in SCENARIOS:
        scores[s] = max(0.0, scores[s])

    # Normalize to probabilities summing to 100
    total = sum(scores.values())
    if total > 0:
        probs = {s: round(scores[s] / total * 100, 2) for s in SCENARIOS}
    else:
        probs = {s: 20.0 for s in SCENARIOS}

    return probs


# ---------------------------------------------------------------------------
# Monte Carlo Bootstrap for Confidence Intervals
# ---------------------------------------------------------------------------

def compute_scenarios_with_uncertainty(
    indices: dict,
    n_iterations: int = 500,
    custom_priors: dict = None,
    custom_weights: dict = None,
) -> dict:
    """Monte Carlo bootstrap for scenario probability confidence intervals.

    Perturbs index values (uniform +/-15%) and model weights (normal +/-20%,
    clipped to +/-40%) across N iterations to produce 90% confidence intervals
    (5th-95th percentile).

    Based on global sensitivity analysis methodology (Saltelli et al., 2004).

    Args:
        indices: dict with index names as keys and float values (0-100).
        n_iterations: number of Monte Carlo iterations (default 500).
        custom_priors: optional override for base priors.

    Returns:
        dict mapping each scenario to {"p5": float, "median": float, "p95": float}.
    """
    random.seed(42)  # reproducible within same snapshot

    priors = custom_priors or PRIORS

    all_probs: dict[str, list[float]] = {s: [] for s in SCENARIOS}

    for _ in range(n_iterations):
        # Perturb indices: uniform +/-15%
        perturbed_indices = {}
        for k, v in indices.items():
            noise = random.uniform(0.85, 1.15)
            perturbed_indices[k] = max(0.0, min(100.0, float(v) * noise))

        # Perturb weights: normal +/-20%, clipped to +/-40%
        base_wm = custom_weights or WEIGHT_MATRIX
        perturbed_weights = {}
        for idx_name, weights in base_wm.items():
            perturbed_weights[idx_name] = {}
            for scenario, w in weights.items():
                noise = random.gauss(1.0, 0.20)
                noise = max(0.6, min(1.4, noise))  # clip to +/-40%
                perturbed_weights[idx_name][scenario] = w * noise

        # Compute with perturbed values
        result = _compute_raw(perturbed_indices, perturbed_weights, priors)
        for s in SCENARIOS:
            all_probs[s].append(result[s])

    # Compute percentiles
    ci = {}
    for s in SCENARIOS:
        sorted_vals = sorted(all_probs[s])
        n = len(sorted_vals)
        ci[s] = {
            "p5": round(sorted_vals[int(n * 0.05)], 1),
            "median": round(sorted_vals[int(n * 0.50)], 1),
            "p95": round(sorted_vals[int(n * 0.95)], 1),
        }

    return ci


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_scenarios(indices: dict, custom_priors: dict = None, custom_weights: dict = None) -> dict:
    """Compute scenario probabilities from current index values.

    Combines Bayesian priors, a calibrated weight matrix, non-linear trigger
    conditions, and Monte Carlo uncertainty estimation to produce scenario
    probabilities with confidence intervals.

    Args:
        indices: dict with NOI, GAI, HDI, PAI, SRI, BSI, DCI (0-100 each).
        custom_priors: optional override for base priors.
        custom_weights: optional override for weight matrix.

    Returns:
        dict with keys:
            - scores: raw (pre-normalization) scenario scores
            - probabilities: normalized probabilities summing to ~100
            - explanations: per-scenario driver breakdown
            - triggers_fired: list of trigger rule labels that activated
            - confidence_intervals: 90% CI from Monte Carlo bootstrap
    """
    priors = custom_priors or PRIORS.copy()
    wm = custom_weights or WEIGHT_MATRIX
    scores = {s: priors.get(s, PRIORS[s]) for s in SCENARIOS}

    # Apply weight matrix and track contributions for explanations
    contributions: dict[str, list] = {s: [] for s in SCENARIOS}
    for idx_name, weights in wm.items():
        idx_val = float(indices.get(idx_name, 0))
        for scenario, weight in weights.items():
            delta = weight * idx_val
            scores[scenario] += delta
            if abs(delta) > 0.5:
                contributions[scenario].append({
                    "index": idx_name,
                    "value": idx_val,
                    "weight": weight,
                    "contribution": round(delta, 2),
                })

    # Apply trigger rules
    float_indices = {k: float(v) for k, v in indices.items()}
    triggers_fired = []
    for rule in TRIGGER_RULES:
        if rule["condition"](float_indices):
            triggers_fired.append(rule["label"])
            for s, boost in rule.get("boost", {}).items():
                scores[s] += boost
            for s, factor in rule.get("dampen", {}).items():
                scores[s] *= factor

    # Clamp scores to >= 0
    for s in SCENARIOS:
        scores[s] = max(0.0, scores[s])

    # Normalize to probabilities summing to 100
    total = sum(scores.values())
    if total > 0:
        probs = {s: round(scores[s] / total * 100, 2) for s in SCENARIOS}
    else:
        probs = {s: 20.0 for s in SCENARIOS}

    # Build explanations
    explanations = {}
    for s in SCENARIOS:
        sorted_contribs = sorted(
            contributions[s], key=lambda x: abs(x["contribution"]), reverse=True
        )
        pos = [c for c in sorted_contribs if c["contribution"] > 0]
        neg = [c for c in sorted_contribs if c["contribution"] < 0]
        explanations[s] = {
            "top_positive_drivers": pos[:3],
            "top_negative_drivers": neg[:3],
            "trigger_rules_fired": [t for t in triggers_fired],
        }

    # Monte Carlo confidence intervals
    ci = compute_scenarios_with_uncertainty(indices, custom_priors=custom_priors, custom_weights=custom_weights)

    return {
        "scores": {s: round(scores[s], 2) for s in SCENARIOS},
        "probabilities": probs,
        "explanations": explanations,
        "triggers_fired": triggers_fired,
        "confidence_intervals": ci,
    }
