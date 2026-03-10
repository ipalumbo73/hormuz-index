'use client';
import { useEffect, useState } from 'react';
import PlotlyWrapper from '@/components/plotly/PlotlyWrapper';
import type { PlotlyFigure } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function NuclearPage() {
  const [noiChart, setNoiChart] = useState<PlotlyFigure | null>(null);
  const [gauges, setGauges] = useState<PlotlyFigure | null>(null);
  const [noiValue, setNoiValue] = useState(0);
  const [components, setComponents] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.allSettled([
      fetch(`${API}/charts/noi-breakdown?range=7d`).then(r => r.json()),
      fetch(`${API}/charts/indices-gauges`).then(r => r.json()),
      fetch(`${API}/dashboard/summary`).then(r => r.json()),
    ]).then(([noi, g, sum]) => {
      if (noi.status === 'fulfilled') setNoiChart(noi.value);
      if (g.status === 'fulfilled') setGauges(g.value);
      if (sum.status === 'fulfilled' && sum.value) {
        setNoiValue(sum.value.indices?.NOI?.value || 0);
        setComponents(sum.value.noi_components || {});
      }
    });
  }, []);

  const componentLabels: Record<string, string> = {
    site_access_loss: 'A: Site Access Loss',
    material_knowledge_loss: 'B: Material Knowledge Loss',
    enrichment_verification_gap: 'C: Enrichment Verification Gap',
    underground_activity_signal: 'D: Underground Activity',
    technical_diplomatic_breakdown: 'E: Technical-Diplomatic Breakdown',
    conflicting_narratives_uncertainty: 'F: Conflicting Narratives',
  };

  const weights: Record<string, number> = {
    site_access_loss: 25,
    material_knowledge_loss: 25,
    enrichment_verification_gap: 20,
    underground_activity_signal: 10,
    technical_diplomatic_breakdown: 10,
    conflicting_narratives_uncertainty: 10,
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-white">Nuclear Opacity Index (NOI)</h2>
      <p className="text-sm text-gray-400">Measures the loss of international verification capability on Iran's nuclear program. Range 0-100.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">NOI Radar Breakdown</h3>
          {noiChart ? (
            <PlotlyWrapper data={noiChart.data} layout={noiChart.layout} config={noiChart.config} height={400} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">No data yet</div>
          )}
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">NOI Components</h3>
          <div className="space-y-3">
            {Object.entries(componentLabels).map(([key, label]) => {
              const value = components[key] || 0;
              const weight = weights[key];
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{label}</span>
                    <span className="text-gray-400">{value.toFixed(1)} ({weight}%)</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-purple-500 transition-all" style={{ width: `${Math.min(100, value)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 p-3 rounded-lg bg-gray-900/50 border border-gray-700">
            <div className="text-xs text-gray-400">Current NOI Value</div>
            <div className="text-4xl font-bold text-purple-400">{noiValue.toFixed(1)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
