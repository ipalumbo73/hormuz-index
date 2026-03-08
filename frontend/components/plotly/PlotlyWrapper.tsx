'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const Plot = dynamic(
  () => {
    return import('plotly.js-dist-min').then((Plotly) => {
      const factory = require('react-plotly.js/factory');
      return { default: factory.default(Plotly.default || Plotly) };
    });
  },
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-dark-800 rounded-xl h-64 flex items-center justify-center">
        <span className="text-gray-500">Loading chart...</span>
      </div>
    ),
  }
);

interface PlotlyWrapperProps {
  data: any[];
  layout?: any;
  config?: any;
  className?: string;
  height?: number;
}

export default function PlotlyWrapper({ data, layout, config, className = '', height = 300 }: PlotlyWrapperProps) {
  const mergedLayout = useMemo(() => ({
    autosize: true,
    height,
    margin: { t: 40, r: 20, b: 40, l: 50 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#9ca3af', size: 11 },
    xaxis: { gridcolor: '#374151', ...layout?.xaxis },
    yaxis: { gridcolor: '#374151', ...layout?.yaxis },
    ...layout,
  }), [layout, height]);

  const mergedConfig = useMemo(() => ({
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    ...config,
  }), [config]);

  return (
    <div className={`w-full ${className}`}>
      {/* @ts-ignore - dynamic import typing */}
      <Plot data={data} layout={mergedLayout} config={mergedConfig} useResizeHandler style={{ width: '100%' }} />
    </div>
  );
}
