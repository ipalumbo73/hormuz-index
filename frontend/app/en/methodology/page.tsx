'use client';

export default function MethodologyPage() {
  return (
    <div className="max-w-[860px] mx-auto space-y-8 text-white/80 leading-relaxed">

      {/* Title */}
      <div className="border-b border-white/10 pb-5">
        <h1 className="text-2xl font-bold text-white">Statistical Methodology — Hormuz Index</h1>
        <p className="text-sm text-white/40 mt-1">Technical document for academic and peer review</p>
        <p className="text-xs text-white/25 mt-2 font-mono">Version 1.1 — March 2026 (revised after peer review)</p>
      </div>

      {/* Abstract */}
      <Section title="0. Abstract">
        <p>
          Hormuz Index is a geopolitical early warning system that monitors the Iran-USA-Israel crisis
          through automated analysis of information flows from 30+ public sources. The system produces
          7 composite risk indices (0-100) and 5 scenario probabilities (summing to 100%), with 90%
          uncertainty bands.
        </p>
        <p className="mt-2">
          This document describes in detail every mathematical and statistical component of the model,
          the academic references on which it is based, and its known limitations. <strong>The model is
          experimental and indicative, not predictive.</strong> The probabilities represent relative
          plausibility conditioned on the data and the assumptions of the model.
        </p>
      </Section>

      {/* 1. Data Pipeline */}
      <Section title="1. Data Pipeline and Event Construction">
        <p>The system collects news from heterogeneous sources, normalises, deduplicates, and classifies them.</p>

        <SubSection title="1.1 Sources and Reliability">
          <p>
            Each source has a fixed reliability score (<code>source_reliability</code>, 0-1).
            The grading system is inspired by the NATO Admiralty Code (STANAG 2511 / AJP-2.1),
            which uses letters A-F for source reliability and numbers 1-6 for information
            credibility. <strong>The conversion to a 0-1 numerical scale is the authors&apos;
            own adaptation</strong>, not a standard NATO procedure. The mapping is:
            A=0.95, B=0.85, C=0.75, D=0.65, E=0.50, F=not used.
          </p>
          <Table headers={['Tier', 'Sources', 'Score']} rows={[
            ['Tier 1 — Wire agencies', 'Reuters, AP, AFP', '0.92 - 0.97'],
            ['Tier 2 — International outlets', 'BBC, Al Jazeera, Guardian, Haaretz', '0.85 - 0.90'],
            ['Tier 3 — Aggregators', 'GDELT, NewsData, GNews', '0.70 - 0.85'],
            ['Tier 4 — Think tanks', 'Carnegie, Brookings, IISS', '0.80 - 0.88'],
            ['Excluded', 'Social media, anonymous sources', 'Not ingested'],
          ]} />
          <p className="text-xs text-white/40 mt-2">
            Reference: NATO STANAG 2511 / AJP-2.1, &quot;Evaluation of intelligence sources and information&quot;,
            Rating A-F for source reliability. Note: STANAG 2022 concerns the format of intelligence
            reports, not the grading system.
          </p>
        </SubSection>

        <SubSection title="1.2 Deduplication">
          <p>
            Articles are grouped by textual similarity using RapidFuzz (normalised Levenshtein algorithm)
            with a similarity threshold of 88%. This produces clusters of articles about the same event.
            Only the representative event of each cluster is ingested.
          </p>
          <Formula>
            similarity(a, b) = 1 - levenshtein_distance(a, b) / max(len(a), len(b))
            <br />
            cluster if similarity &ge; 0.88
          </Formula>
        </SubSection>

        <SubSection title="1.3 Event Classification">
          <p>
            Each event is classified into one of 17 categories via regex pattern matching
            against the text (title + summary). The classification assigns:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>category</strong>: event type (e.g. military_strike, enrichment_signal)</li>
            <li><strong>signal_keys</strong>: which indices it feeds (e.g. GAI, BSI)</li>
            <li><strong>base_severity</strong>: baseline severity of the category (0-1)</li>
            <li><strong>confidence</strong>: number of matched patterns / total patterns for the rule</li>
          </ul>
          <p className="mt-2">
            The classification is rule-based (not LLM) for reproducibility and transparency.
            Each category has a geographic relevance filter: events unrelated to the
            Iran/Gulf/Middle East area are excluded for categories that require it.
          </p>
        </SubSection>
      </Section>

      {/* 2. Event Impact */}
      <Section title="2. Event Impact">
        <p>Each classified event produces a composite impact score:</p>
        <Formula>
          impact<sub>i</sub> = source_reliability<sub>i</sub> &times; confidence<sub>i</sub> &times; severity<sub>i</sub> &times; novelty<sub>i</sub>
        </Formula>
        <Table headers={['Factor', 'Range', 'Meaning', 'Calibration source']} rows={[
          ['source_reliability', '0-1', 'Source credibility (fixed per source)', 'Authors\' adaptation from NATO Admiralty Code (STANAG 2511)'],
          ['confidence', '0-1', 'Classifier confidence', 'Proportion of matched patterns'],
          ['severity', '0-1', 'Baseline severity of the event category', 'Goldstein scale (1992), adapted'],
          ['novelty', '0-1', 'How novel the event is (deduplication factor)', 'Cluster/duplicate ratio'],
        ]} />
        <p className="text-xs text-white/40 mt-2">
          <strong>Severity reference:</strong> Goldstein, J.S. (1992). &quot;A Conflict-Cooperation Scale for WEIS
          International Events Data.&quot; <em>Journal of Conflict Resolution</em>, 36(2), 369-385.
          The original scale ranges from -10 (maximum conflict) to +10 (maximum cooperation).
          <strong> The system uses only the conflict dimension</strong> (negative values of the scale),
          normalised to (0, 1). Cooperative events (positive in the original scale) are not
          captured by the severity factor — the cooperative component is handled separately
          by the DCI (Diplomatic Channels Index). This design choice produces an intentional
          asymmetry: the model is more sensitive to conflict signals.
        </p>
      </Section>

      {/* 3. Subindex */}
      <Section title="3. Subindex Computation">
        <p>
          Each index aggregates classified event signals via impact-weighted averaging.
          This is the standard approach for composite index construction
          (OECD/JRC Handbook on Constructing Composite Indicators, 2008, Ch. 4 &quot;Weighting&quot;).
        </p>
        <Formula>
          subindex<sub>k</sub> = &Sigma;<sub>i</sub> (impact<sub>i</sub> &times; signal_value<sub>i,k</sub>) / &Sigma;<sub>i</sub> impact<sub>i</sub>
        </Formula>
        <p>
          Where <code>signal_value<sub>i,k</sub></code> is the value of signal k in event i
          (e.g. BSI=95 for an enrichment event). If no event carries signal k, the subindex equals 0.
        </p>
        <p className="text-xs text-white/40 mt-2">
          <strong>Reference:</strong> OECD/JRC (2008). <em>Handbook on Constructing Composite Indicators: Methodology and User Guide.</em>
          Paris: OECD Publishing. Section 4.2: &quot;Weights based on statistical methods.&quot;
        </p>
      </Section>

      {/* 4. Rolling Window */}
      <Section title="4. Rolling Window">
        <p>
          Each final index is a weighted combination of three discrete time windows.
          This is a <strong>heuristic design choice</strong>, not a formal derivation
          from a specific statistical model:
        </p>
        <Formula>
          Index<sub>t</sub> = 0.50 &times; score<sub>24h</sub> + 0.30 &times; score<sub>7d</sub> + 0.20 &times; score<sub>30d</sub>
        </Formula>
        <Table headers={['Window', 'Weight', 'Rationale']} rows={[
          ['Last 24 hours', '0.50 (50%)', 'Maximum responsiveness to recent signals'],
          ['Last 7 days', '0.30 (30%)', 'Short-term trend'],
          ['Last 30 days', '0.20 (20%)', 'Baseline and historical context'],
        ]} />
        <p className="mt-2 text-sm">
          <strong>Rationale:</strong> The 50/30/20 weights give decreasing priority to more recent
          observations, consistent with the pace of geopolitical crisis evolution.
          This is a <strong>3-bucket discretisation</strong>, not a formal EWMA (Exponentially
          Weighted Moving Average) on a continuous series. The analogy with exponential
          decay schemes is pedagogical, not mathematical: a classical EWMA has the formula
          S<sub>t</sub> = &alpha; &times; X<sub>t</sub> + (1-&alpha;) &times; S<sub>t-1</sub>
          with half-life = ln(2)/ln(1/(1-&alpha;)), which is not directly comparable to 3 discrete
          windows with fixed weights.
        </p>
        <p className="text-xs text-white/40 mt-2">
          <strong>Note:</strong> Earlier versions of this document cited Engle &amp; Manganelli (2004)
          &quot;CAViaR&quot; and RiskMetrics/J.P. Morgan (1996) as references for this section.
          Those references have been removed as they are not pertinent: CAViaR is a model for
          financial Value at Risk, not for geopolitical indices. The 50/30/20 choice is a
          heuristic decision by the authors, not a derivation from a specific academic model.
        </p>
      </Section>

      {/* 5. NOI */}
      <Section title="5. Nuclear Opacity Index (NOI) — 6-Component Composite Index">
        <p>
          The NOI measures the degree to which the Iranian nuclear programme is opaque to
          international verification. It is a composite index with 6 weighted sub-components,
          inspired by the structure of the NTI Nuclear Security Index (Nuclear Threat Initiative, 2020-2024).
          <strong> The weight allocation (A+B = 50%, C+D+E+F = 50%) reflects expert
          judgement</strong> (expert elicitation) that physical verification (site access +
          material knowledge) is the most critical dimension of nuclear opacity.
          This choice is not derived from a specific NTI formula but from the authors&apos;
          assessment of IAEA safeguards priorities.
        </p>
        <Formula>
          NOI = 0.25&times;A + 0.25&times;B + 0.20&times;C + 0.10&times;D + 0.10&times;E + 0.10&times;F
        </Formula>
        <Table headers={['Comp.', 'Name', 'Weight', 'What it measures', 'NTI Ref.']} rows={[
          ['A', 'Site Access Loss', '25%', 'Loss of IAEA physical access to declared sites', 'Security & Control Measures'],
          ['B', 'Material Knowledge Loss', '25%', 'Loss of knowledge on quantity/location of materials', 'Quantities and Sites'],
          ['C', 'Enrichment Verification Gap', '20%', 'Gap in verification of enrichment levels', 'IAEA Safeguards Reports'],
          ['D', 'Underground Activity Signal', '10%', 'Activity at underground/bunkerised sites (Fordow)', 'IAEA reports on Fordow'],
          ['E', 'Technical Diplomatic Breakdown', '10%', 'Breakdown of technical cooperation with the IAEA', 'NTI Global Norms'],
          ['F', 'Conflicting Narratives', '10%', 'Conflicting narratives about the programme status', 'Intelligence analysis metric'],
        ]} />

        <SubSection title="5.1 Hard Rules (Threshold Effects)">
          <p>The NOI includes non-linear rules to capture historically documented threshold effects:</p>
          <Table headers={['Rule', 'Condition', 'Effect', 'Historical precedent']} rows={[
            ['HR-1', 'A >= 75 AND B >= 90', 'NOI = max(NOI, 80)', 'North Korea pre-test 2006: total loss of access + materials'],
            ['HR-2', 'C >= 75 AND D >= 50', 'NOI += 5', 'Iran 2012: enrichment gap + Fordow activity = compound risk'],
            ['HR-3', 'E >= 80 AND F >= 70', 'NOI += 3', 'Iraq 2002: diplomatic breakdown + conflicting narratives = uncertainty'],
          ]} />
        </SubSection>

        <SubSection title="5.2 Interpretive Thresholds">
          <p>Aligned with IAEA Safeguards conclusion categories:</p>
          <Table headers={['Range', 'Level', 'Equivalent IAEA meaning']} rows={[
            ['0-24', 'Green', 'Broader Conclusion: all material is accounted for'],
            ['25-49', 'Yellow', 'Partial verification gaps'],
            ['50-69', 'Orange', 'Significant verification gaps'],
            ['70-84', 'Red', 'Unable to verify the peaceful nature'],
            ['85-100', 'Dark red', 'Near-total opacity'],
          ]} />
        </SubSection>

        <p className="text-xs text-white/40 mt-2">
          <strong>References:</strong> NTI Nuclear Security Index (ntiindex.org); IAEA Safeguards Implementation
          Reports (GOV/ series); Albright, D. &amp; Burkhard, S. (2021). &quot;Iran&apos;s Nuclear Program: Status
          and Uncertainties.&quot; Institute for Science and International Security.
        </p>
      </Section>

      {/* 6. Scenario Model */}
      <Section title="6. Scenario Model — Weighted Additive Scoring Model">
        <p>
          The model produces 5 mutually exclusive probabilities (summing to 100%) representing
          the <em>relative plausibility</em> of each scenario conditioned on the current index values.
        </p>
        <div className="my-3 px-3 py-2 rounded-lg text-[11px]" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
          <strong className="text-red-400">Terminological note:</strong>{' '}
          <span className="text-white/50">
            Earlier versions of this document used the term &quot;Bayesian priors&quot; for the
            baseline values. This terminology was <strong>technically incorrect</strong>. A Bayesian
            prior implies the application of Bayes&apos; theorem with an explicit likelihood function:
            P(scenario|data) &prop; P(data|scenario) &times; P(scenario). Our model does not compute
            any likelihood — it is an additive linear model with fixed initial values.
            The terminology has been corrected to &quot;baseline scores&quot;.
          </span>
        </div>

        <SubSection title="6.1 Baseline Scores (Literature-Informed Initial Values)">
          <p>
            Each scenario starts from a baseline score informed by the literature.
            These are <strong>not Bayesian priors</strong> in the formal sense — neither Bayes&apos;
            theorem nor a likelihood function is applied. They are initial values of an additive
            model, calibrated on historical base rates to give the model a reasonable starting point.
          </p>
          <Table headers={['Scenario', 'Baseline', 'Calibration source']} rows={[
            ['Contained Conflict', '50.0', 'ICG CrisisWatch 2003-2024: ~70% of monitored crises remain contained. Reduced to 50 by subjective author choice: the positive weights from risk indices shift the distribution towards escalation scenarios, so the "contained" baseline must start lower to compensate. This reduction is NOT a formally documented procedure.'],
            ['Regional War', '25.0', 'ICG: regional spillover in ~20-30% of serious crises historically.'],
            ['Nuclear Threshold', '15.0', 'Crises with a nuclear dimension: very few cases post-1945 (Cuba 1962, Kargil 1999).'],
            ['Nuclear Coercion', '7.0', 'Coercive nuclear signalling: ~5-7 cases since 1945 (Berlin 1948, Korea 1953, Taiwan 1954/58, Cuba 1962, Kargil 1999).'],
            ['Actual Nuclear Use', '2.0', 'Zero cases since 1945. GCR Institute 2020 expert surveys: annualised probability 0.3-1.5%. Metaculus community forecast.'],
          ]} />
          <p className="text-xs text-white/40 mt-2">
            <strong>References:</strong> International Crisis Group, CrisisWatch Database (2003-2024);
            GCR Institute (2020), &quot;Expert Survey on Global Catastrophic Risks&quot;;
            Metaculus, &quot;Nuclear weapon detonation by 2030&quot; community forecast.
          </p>
        </SubSection>

        <SubSection title="6.2 Weight Matrix">
          <p>
            The weight matrix encodes the causal pathways from each index to each scenario.
            The design is <strong>inspired by</strong> the GCRI (Global Conflict Risk Index)
            framework of the European Commission&apos;s Joint Research Centre (2014), but with an
            important structural difference: the GCRI derives its weights empirically via logistic
            regression on historical conflict data, whereas <strong>our weights are assigned
            manually</strong> through causal reasoning and expert judgement. There is no sufficiently
            large historical dataset of &quot;Iran-Gulf crises with known outcomes&quot; to perform
            regression. The weights reflect the causal logic of the literature, not a statistical
            calibration.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse mt-2">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-2 px-2 text-white/60">Index</th>
                  <th className="text-center py-2 px-1 text-green-400">Contained</th>
                  <th className="text-center py-2 px-1 text-yellow-400">Regional</th>
                  <th className="text-center py-2 px-1 text-orange-400">Threshold</th>
                  <th className="text-center py-2 px-1 text-red-400">Coercion</th>
                  <th className="text-center py-2 px-1 text-red-800">Actual Use</th>
                  <th className="text-left py-2 px-2 text-white/40">Rationale</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {[
                  { idx: 'NOI', vals: [-0.15, 0.06, 0.25, 0.15, 0.00], reason: "Iranian nuclear opacity: drives 'threshold' (approach to capability). ZERO weight on 'actual use' because Iran does not possess nuclear weapons." },
                  { idx: 'GAI', vals: [-0.12, 0.30, 0.04, 0.03, 0.01], reason: 'Conventional attacks: primary driver of regional war. Does not directly cause nuclear escalation.' },
                  { idx: 'HDI', vals: [-0.10, 0.25, 0.06, 0.04, 0.02], reason: 'Hormuz disruption: amplifies regional war. Limited indirect effect on nuclear scenarios.' },
                  { idx: 'PAI', vals: [-0.08, 0.20, 0.03, 0.02, 0.01], reason: 'Proxy forces: feed regional war but do not directly cause nuclear escalation.' },
                  { idx: 'SRI', vals: [-0.08, 0.08, 0.15, 0.25, 0.10], reason: "Strategic rhetoric: primary driver of 'coercion' (nuclear threats from armed states). Strongest driver of 'actual use' — rhetoric precedes action." },
                  { idx: 'BSI', vals: [-0.12, 0.04, 0.30, 0.22, 0.08], reason: "Breakout/nuclear posture: primary driver of 'threshold'. Second driver of 'actual use' — active nuclear posture from USA/Israel." },
                  { idx: 'DCI', vals: [0.25, -0.15, -0.20, -0.18, -0.12], reason: "Diplomacy: sole positive driver of 'contained'. Restrains all escalation scenarios." },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-1.5 px-2 font-semibold text-white/70">{row.idx}</td>
                    {row.vals.map((v, j) => (
                      <td key={j} className="text-center py-1.5 px-1" style={{
                        color: v > 0 ? '#ef4444' : v < 0 ? '#22c55e' : '#555',
                      }}>
                        {v > 0 ? '+' : ''}{v.toFixed(2)}
                      </td>
                    ))}
                    <td className="py-1.5 px-2 text-[10px] text-white/35 font-sans max-w-[280px]">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="text-sm font-semibold text-white/60 mt-4 mb-2">Matrix design principles:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-white/60">
            <li>GAI and HDI are the primary drivers of conventional regional war (+0.30, +0.25).</li>
            <li>NOI tracks the opacity of the Iranian programme. Since Iran does NOT possess nuclear weapons, NOI drives only &quot;threshold&quot; (approach to capability). NOI has ZERO weight on &quot;actual use&quot;.</li>
            <li>BSI tracks both the Iranian path towards a device AND nuclear posture signals from already-armed states (USA, Israel). BSI drives &quot;threshold&quot; (+0.30) and is the second driver of &quot;actual use&quot; (+0.08).</li>
            <li>SRI captures escalatory rhetoric from states possessing nuclear weapons. It is the strongest driver of &quot;actual use&quot; (+0.10) because rhetoric precedes action.</li>
            <li>DCI (diplomacy) is the sole restraining force. It is the only index with a positive weight on &quot;contained&quot; (+0.25) and a negative weight on all other scenarios.</li>
            <li>Actual nuclear use can originate ONLY from the USA/Israel (which possess nuclear weapons) or from a Russia/China transfer to Iran (monitored but extremely unlikely).</li>
          </ol>

          <p className="text-xs text-white/40 mt-3">
            <strong>Reference:</strong> EU Joint Research Centre (2014). &quot;Global Conflict Risk Index (GCRI):
            A quantitative model — Concept and methodology.&quot; JRC Technical Reports. The GCRI uses
            logistic regression on historical data to derive weights empirically.
            <strong> Our weights are NOT derived in the same manner</strong> — they are assigned
            manually through causal analysis of the Iran-Gulf theatre. The GCRI is cited as
            conceptual inspiration for the index-to-scenario matrix approach, not as a
            replicated methodology.
          </p>
        </SubSection>

        <SubSection title="6.3 Raw Score Computation">
          <p>For each scenario s:</p>
          <Formula>
            score<sub>s</sub> = baseline<sub>s</sub> + &Sigma;<sub>k</sub> (W<sub>k,s</sub> &times; Index<sub>k</sub>)
          </Formula>
          <p>
            Where baseline<sub>s</sub> is the baseline score of scenario s (Section 6.1),
            W<sub>k,s</sub> is the weight of index k on scenario s (Section 6.2),
            and Index<sub>k</sub> is the current index value (0-100).
            This is an additive linear aggregation, not a Bayesian update.
          </p>
        </SubSection>

        <SubSection title="6.4 Trigger Rules (Non-Linear Effects)">
          <p>
            The weight matrix is linear and does not capture the non-linear dynamics of escalation.
            Trigger rules add additive boosts or multiplicative factors when multiple indices
            simultaneously exceed critical thresholds.
          </p>
          <Table headers={['Rule', 'Condition', 'Effect', 'Rationale']} rows={[
            ['TR-1', 'NOI >= 75 AND BSI >= 65', 'threshold += 5', 'Nuclear opacity + breakout signals = nuclear threshold crisis more likely'],
            ['TR-2', 'SRI >= 75 AND BSI >= 70', 'coercive += 4', 'Extreme rhetoric from armed states + active posture = nuclear coercion'],
            ['TR-3', 'SRI >= 85 AND BSI >= 80 AND GAI >= 80', 'actual += 3', 'Extreme convergence: rhetoric + posture + intense conventional conflict. Only path to actual use.'],
            ['TR-4', 'DCI >= 65', 'regional, threshold, coercive, actual x 0.90', 'Active diplomacy reduces all escalatory scenarios by 10%'],
          ]} />
        </SubSection>

        <SubSection title="6.5 Normalisation">
          <p>Raw scores are clamped to &ge; 0 and normalised to sum to 100:</p>
          <Formula>
            score<sub>s</sub> = max(0, score<sub>s</sub>)
            <br /><br />
            P(s) = score<sub>s</sub> / &Sigma;<sub>j</sub> score<sub>j</sub> &times; 100
          </Formula>
          <p>
            The resulting probabilities are <strong>relative plausibilities</strong>, not
            calibrated probabilities in the Brier score sense. They represent the distribution
            of plausibility across scenarios given the current state of the indices.
          </p>
        </SubSection>
      </Section>

      {/* 7. Monte Carlo */}
      <Section title="7. Confidence Intervals — Monte Carlo Bootstrap">
        <SubSection title="7.1 Monte Carlo for Scenarios">
          <p>
            To quantify the uncertainty of scenario probabilities, the model runs a Monte Carlo
            simulation with N=500 iterations, following the global sensitivity analysis framework
            of Saltelli et al. (2004).
          </p>
          <p className="mt-2">At each iteration:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-white/60">
            <li><strong>Index perturbation:</strong> each index value is multiplied by a uniform
              random factor U(0.85, 1.15), i.e. &plusmn;15%, then clamped to [0, 100].</li>
            <li><strong>Weight perturbation:</strong> each weight in the matrix is multiplied by a
              normal random factor N(1.0, 0.20), clipped to [0.6, 1.4], i.e. &plusmn;20% with max &plusmn;40%.</li>
            <li>Probabilities are recomputed with the perturbed values.</li>
          </ol>
          <Formula>
            Index<sub>k</sub>&apos; = clamp(Index<sub>k</sub> &times; U(0.85, 1.15), 0, 100)
            <br />
            W<sub>k,s</sub>&apos; = W<sub>k,s</sub> &times; clip(N(1.0, 0.20), 0.6, 1.4)
            <br /><br />
            CI<sub>90%</sub> = [percentile<sub>5</sub>, percentile<sub>95</sub>] over 500 iterations
          </Formula>
          <p className="mt-2 text-sm text-white/60">
            The seed is fixed (seed=42) for reproducibility within the same snapshot.
            The simultaneous perturbation of model inputs and parameters follows the principle of
            &quot;global sensitivity analysis&quot; — superior to one-at-a-time (OAT) perturbation because
            it captures parameter interactions.
          </p>
          <p className="text-xs text-white/40 mt-2">
            <strong>Reference:</strong> Saltelli, A., Tarantola, S., Campolongo, F. &amp; Ratto, M. (2004).
            <em> Sensitivity Analysis in Practice: A Guide to Assessing Scientific Models.</em> Wiley.
            Ch. 2: &quot;Why should one perform sensitivity analysis?&quot; and Ch. 5: &quot;Global sensitivity analysis.&quot;
          </p>
        </SubSection>

        <SubSection title="7.2 Bootstrap for Indices">
          <p>
            Individual indices have uncertainty bands computed via non-parametric bootstrap
            (Efron &amp; Tibshirani, 1993). Over N=200 iterations, events in the 24h window are
            resampled with replacement and the subindex is recomputed.
          </p>
          <Formula>
            For each iteration b = 1, ..., 200:
            <br />
            &nbsp;&nbsp;events<sub>b</sub> = sample with replacement from events<sub>24h</sub>
            <br />
            &nbsp;&nbsp;subindex<sub>b</sub> = compute_subindex(events<sub>b</sub>, signal_key)
            <br /><br />
            CI<sub>90%</sub> = [subindex<sub>(10)</sub>, subindex<sub>(190)</sub>]
            <br />
            (5th and 95th percentile: position 0.05&times;200=10 and 0.95&times;200=190)
          </Formula>
          <p className="mt-2 text-sm text-white/60">
            For indices with fewer than 5 events, the CI is analytically widened (&plusmn;40% of the value
            or &plusmn;10 points, whichever is greater) to reflect the high uncertainty from a small sample.
          </p>
          <p className="text-xs text-white/40 mt-2">
            <strong>Reference:</strong> Efron, B. &amp; Tibshirani, R. (1993). <em>An Introduction to the
            Bootstrap.</em> Chapman &amp; Hall/CRC. Ch. 13: &quot;Bootstrap confidence intervals.&quot;
          </p>
        </SubSection>
      </Section>

      {/* 8. Asymmetry */}
      <Section title="8. Nuclear Asymmetry — Iran Does Not Possess Nuclear Weapons">
        <p>
          A critical aspect of the model is the correct modelling of nuclear asymmetry
          in this crisis. Iran <strong>does not possess nuclear weapons</strong> and its programme
          is far from producing any. The only nuclear-armed powers in the theatre are the USA and Israel.
        </p>
        <p className="mt-2">This is reflected in the model in three ways:</p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-white/60 mt-2">
          <li>
            <strong>NOI has ZERO weight on &quot;Actual Nuclear Use&quot;</strong>: opacity of the Iranian
            programme cannot cause nuclear use because Iran has no weapons to use.
          </li>
          <li>
            <strong>SRI is the primary driver of &quot;Actual Use&quot;</strong> (+0.10): it captures
            nuclear rhetoric from the USA/Israel — the only actors that can actually use nuclear weapons.
          </li>
          <li>
            <strong>Category &quot;nuclear_transfer_signal&quot;</strong>: the classifier monitors signals
            of nuclear transfer from Russia/China to Iran (the only path through which Iran
            could obtain a nuclear device in the short term). Severity 0.98 — the highest
            in the system.
          </li>
        </ol>
        <p className="text-xs text-white/40 mt-3">
          <strong>Sources on Iranian nuclear capability:</strong> IAEA Director General Reports (GOV/2024 series);
          Albright, D. (2024), ISIS Reports; Bulletin of the Atomic Scientists;
          U.S. Intelligence Community Annual Threat Assessment 2024-2025.
        </p>
      </Section>

      {/* 9. Limitations */}
      <Section title="9. Known Limitations and Caveats">
        <div className="space-y-3">
          <LimitItem n={1} title="Weights not empirically validated">
            The weight matrix follows the causal logic of the literature (GCRI, NTI) but
            <strong> has not been calibrated via back-testing</strong> on historical crises.
            There is no dataset of &quot;past Iran-Gulf crises with known outcomes&quot; sufficiently
            large for regression. The weights are theory-informed, not data-driven.
          </LimitItem>
          <LimitItem n={2} title="Rule-based classifier">
            The classifier uses regex pattern matching, not advanced NLP. This ensures
            transparency and reproducibility but may produce false positives (irrelevant events
            classified as relevant) and false negatives (relevant events not captured).
          </LimitItem>
          <LimitItem n={3} title="Source bias">
            The system ingests only public sources in English. This introduces bias:
            English-language media coverage over-represents the Western perspective and may
            under-represent internal Iranian developments or China/Russia positions.
          </LimitItem>
          <LimitItem n={4} title="Uncalibrated probabilities">
            The probabilities produced are <em>relative plausibilities</em>, not calibrated forecasts.
            They have not passed calibration tests (Brier score, reliability diagram).
            A calibrated model would require historical resolution data that do not exist
            for events of this nature.
          </LimitItem>
          <LimitItem n={5} title="Monte Carlo on the model, not on reality">
            The Monte Carlo uncertainty bands quantify <em>model</em> uncertainty
            (sensitivity to perturbations of inputs and weights), not <em>real-world</em> uncertainty.
            An unpredictable event (black swan) can breach any confidence band.
          </LimitItem>
          <LimitItem n={6} title="Index independence">
            The indices are treated as independent in the weight matrix, but in reality
            they are correlated (e.g. a military attack GAI can trigger escalatory rhetoric SRI).
            The trigger rules partially capture these interactions but not completely.
          </LimitItem>
          <LimitItem n={7} title="Data latency">
            The system updates indices at each Celery cycle (default: every 15 minutes for RSS,
            30 min for APIs). Rapidly evolving events may not be captured in real time.
          </LimitItem>
        </div>
      </Section>

      {/* 10. Interpretation */}
      <Section title="10. Interpretation Guide">
        <div className="space-y-3 text-sm text-white/60">
          <p>
            <strong>Trends are more informative than absolute values.</strong> An index rising
            from 30 to 50 within 24 hours is a stronger signal than a stable index at 60.
          </p>
          <p>
            <strong>Uncertainty bands are essential.</strong> A &quot;Nuclear Threshold&quot; probability
            of 25% with CI [15%-35%] is very different from 25% with CI [24%-26%]. Wide bands
            indicate high model sensitivity to small variations.
          </p>
          <p>
            <strong>The dominant scenario is relative, not absolute.</strong> If &quot;Regional War&quot;
            is at 45%, it does not mean there is a 45% probability of war. It means that,
            among the model&apos;s 5 scenarios, regional war is the most plausible given the
            current information.
          </p>
          <p>
            <strong>Always compare with expert analysis.</strong> This system is a complement,
            not a substitute, to human analysis. Primary sources (IAEA reports, official
            statements, ICG analysis) remain the gold standard.
          </p>
        </div>
      </Section>

      {/* References */}
      <Section title="11. References">
        <ol className="list-decimal list-inside space-y-2 text-sm text-white/50">
          <li>Albright, D. &amp; Burkhard, S. (2021). &quot;Iran&apos;s Nuclear Program: Status and Uncertainties.&quot; <em>Institute for Science and International Security.</em></li>
          <li>Efron, B. &amp; Tibshirani, R. (1993). <em>An Introduction to the Bootstrap.</em> Chapman &amp; Hall/CRC.</li>
          <li><del className="text-white/25">Engle, R. &amp; Manganelli, S. (2004). &quot;CAViaR.&quot;</del> <span className="text-red-400/60">[Removed v1.1: citation not pertinent, concerns financial VaR]</span></li>
          <li>EU Joint Research Centre (2014). &quot;Global Conflict Risk Index (GCRI): A quantitative model.&quot; <em>JRC Technical Reports.</em></li>
          <li>GCR Institute (2020). &quot;Expert Survey on Global Catastrophic Risks.&quot;</li>
          <li>Goldstein, J.S. (1992). &quot;A Conflict-Cooperation Scale for WEIS International Events Data.&quot; <em>Journal of Conflict Resolution</em>, 36(2), 369-385.</li>
          <li>International Crisis Group. <em>CrisisWatch Database</em> (2003-2024). crisisgroup.org</li>
          <li>NATO. <em>STANAG 2511 / AJP-2.1: Evaluation of Intelligence Sources and Information.</em> <span className="text-green-400/40">[Corrected v1.1: was erroneously cited as STANAG 2022]</span></li>
          <li>NTI (Nuclear Threat Initiative). <em>Nuclear Security Index</em> (2020-2024). ntiindex.org</li>
          <li>OECD/JRC (2008). <em>Handbook on Constructing Composite Indicators: Methodology and User Guide.</em> Paris: OECD Publishing.</li>
          <li><del className="text-white/25">RiskMetrics Group / J.P. Morgan (1996). <em>RiskMetrics Technical Document.</em></del> <span className="text-red-400/40">[Removed v1.1: decorative citation, not pertinent to discrete windows]</span></li>
          <li>Saltelli, A., Tarantola, S., Campolongo, F. &amp; Ratto, M. (2004). <em>Sensitivity Analysis in Practice.</em> Wiley.</li>
          <li>IAEA. <em>Safeguards Implementation Reports</em> (GOV/ series, annual).</li>
          <li>Metaculus. &quot;Nuclear weapon detonation by 2030.&quot; Community forecast.</li>
        </ol>
      </Section>

      <div className="border-t border-white/10 pt-4 pb-8 text-center text-xs text-white/20 font-mono">
        Hormuz Index — Methodological document v1.1 — March 2026
        <br />
        This document is an integral part of the system and is updated with each model revision.
      </div>
    </div>
  );
}


/* ---------- Reusable components ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-white mb-3 border-b border-white/10 pb-1">{title}</h2>
      <div className="text-sm text-white/65 leading-relaxed">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-[13px] font-semibold text-white/70 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 px-4 py-3 rounded-lg font-mono text-[12px] text-blue-300 leading-relaxed" style={{
      background: 'rgba(59,130,246,0.06)',
      border: '1px solid rgba(59,130,246,0.15)',
    }}>
      {children}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse mt-2">
        <thead>
          <tr className="border-b border-white/15">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-1.5 px-2 text-white/50 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5">
              {row.map((cell, j) => (
                <td key={j} className="py-1.5 px-2 text-white/50">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LimitItem({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
      <div className="text-[12px] font-semibold text-white/60 mb-1">Limitation {n}: {title}</div>
      <p className="text-[11px] text-white/45 leading-relaxed">{children}</p>
    </div>
  );
}
