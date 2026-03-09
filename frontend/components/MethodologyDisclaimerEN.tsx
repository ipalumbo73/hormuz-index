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
      {/* Always visible banner */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2 text-[12px] text-white/50">
          <span className="flex-shrink-0">{'\u26A0\uFE0F'}</span>
          <span>This system analyzes public news, not verified facts &mdash; Read the disclaimer</span>
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
            <div className="text-[12px] text-white/60 font-semibold mb-1">Important disclaimer</div>
            <p>
              Hormuz Index is <strong className="text-white/60">not an intelligence system</strong>.
              It exclusively analyzes public news from international media (wire services,
              RSS feeds, aggregators). The data reflects <strong className="text-white/60">media tone</strong>,
              not necessarily the situation on the ground. Media outlets tend to emphasize alarming
              news &mdash; this bias is reflected in the index values.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">What the indices measure</div>
            <p>
              The indices (0-100) represent the intensity of <strong className="text-white/60">media
              coverage</strong> on each topic, not the actual risk level. A high index means
              the media is talking a lot about that topic, not that the risk is necessarily high.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">Nuclear scenarios</div>
            <p>
              Iran does not possess nuclear weapons. The &ldquo;coercive&rdquo; and &ldquo;actual nuclear
              use&rdquo; scenarios refer exclusively to the possibility that the USA or Israel (the only
              actors with nuclear weapons in the region) might use them. Historically, no nuclear weapon
              has been used since 1945. The probabilities shown are indicative estimates based on
              news tone, not calibrated forecasts.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">How to interpret</div>
            <p>
              Use as an exploratory tool to follow media coverage trends.
              <strong className="text-white/60"> Relative trends</strong> (changes over time) are more
              meaningful than absolute values. Always compare with primary sources, institutional
              reports (IAEA, ICG) and expert analysis before drawing conclusions.
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
