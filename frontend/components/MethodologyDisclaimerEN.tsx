'use client';
import { useState } from 'react';

export default function MethodologyDisclaimerEN() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-[10px] overflow-hidden transition-all"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {/* Collapsed header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2 text-[12px] text-white/50">
          <span className="flex-shrink-0">{'\u26A0\uFE0F'}</span>
          <span>Experimental model &mdash; Methodology and limitations</span>
        </span>
        <span
          className="text-white/30 text-[11px] transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          &#9662;
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 text-[11px] text-white/45 leading-relaxed">
          <div>
            <div className="text-[12px] text-white/60 font-semibold mb-1">Methodology note</div>
            <p>
              Hormuz Index is an experimental system for automated news aggregation and analysis.
              The numerical values represent indicative estimates, not calibrated predictions.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">Sources</div>
            <p>
              Data comes from 30+ public sources (news agencies, RSS, APIs) and GDELT. Event
              classification uses rule-based pattern matching.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">Model</div>
            <p>
              The indices (0-100) are weighted averages of signals extracted from news with a time
              window (50% 24h, 30% 7d, 20% 30d). Scenarios use a weight matrix with Bayesian
              priors and bootstrap Monte Carlo for uncertainty bands.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">Limitations</div>
            <p>
              The model weights are calibrated on academic frameworks (GCRI, NTI Nuclear Security
              Index, Goldstein scale) but have not been validated with complete back-testing on
              historical crises. Probabilities include uncertainty bands (90% interval) to
              reflect this limitation.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">How to interpret</div>
            <p>
              Use as an exploratory monitoring tool, not as a prediction. Trends and relative
              variations are more meaningful than absolute values. Always compare with primary
              sources and expert analysis.
            </p>
          </div>

          <div className="pt-1">
            <a href="/en/methodology" className="text-white/30 underline underline-offset-2 cursor-pointer hover:text-white/50 transition-colors">
              Full methodology and academic references
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
