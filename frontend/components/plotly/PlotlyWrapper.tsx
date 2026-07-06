'use client';
import dynamic from 'next/dynamic';
import { Component, ReactNode, useEffect, useMemo, useState } from 'react';

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

// If the Plotly bundle fails to load or render (network hiccup, bad payload),
// show a compact fallback instead of crashing the whole page.
class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-dark-800 rounded-xl h-64 flex flex-col items-center justify-center gap-2">
          <span className="text-gray-500 text-sm">Chart unavailable</span>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-200"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface PlotlyWrapperProps {
  data: any[];
  layout?: any;
  config?: any;
  className?: string;
  height?: number;
}

function useIsMobile(): boolean {
  // Evaluated in an effect so the first client render matches SSR output.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function PlotlyWrapper({ data, layout, config, className = '', height = 300 }: PlotlyWrapperProps) {
  const isMobile = useIsMobile();

  const mergedLayout = useMemo(() => ({
    autosize: true,
    height: isMobile ? Math.min(height, 200) : height,
    margin: isMobile ? { t: 30, r: 10, b: 30, l: 35 } : { t: 40, r: 20, b: 40, l: 50 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#9ca3af', size: isMobile ? 9 : 11 },
    xaxis: { gridcolor: '#374151', ...layout?.xaxis },
    yaxis: { gridcolor: '#374151', ...layout?.yaxis },
    legend: isMobile ? { font: { size: 8 }, orientation: 'h' as const, y: -0.3 } : undefined,
    ...layout,
  }), [layout, height, isMobile]);

  const mergedConfig = useMemo(() => ({
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    ...config,
  }), [config]);

  return (
    <div className={`w-full ${className}`}>
      <ChartErrorBoundary>
        {/* @ts-ignore - dynamic import typing */}
        <Plot data={data} layout={mergedLayout} config={mergedConfig} useResizeHandler style={{ width: '100%' }} />
      </ChartErrorBoundary>
    </div>
  );
}
