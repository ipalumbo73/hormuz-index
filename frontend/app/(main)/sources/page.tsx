'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface Source {
  id: string;
  name: string;
  source_type: string;
  country: string;
  tier: number;
  reliability_score: number;
  official_flag: boolean;
  active: boolean;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    fetch(`${API}/sources`)
      .then(r => r.json())
      .then(data => setSources(Array.isArray(data) ? data : []))
      .catch(() => setSources([]));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Data Sources</h2>
      <p className="text-sm text-gray-400">Sources feeding the geopolitical risk model.</p>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Type</th>
              <th className="text-left py-3 px-4">Country</th>
              <th className="text-center py-3 px-4">Tier</th>
              <th className="text-center py-3 px-4">Reliability</th>
              <th className="text-center py-3 px-4">Official</th>
              <th className="text-center py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(src => (
              <tr key={src.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-3 px-4 font-medium text-white">{src.name}</td>
                <td className="py-3 px-4 text-gray-400">{src.source_type}</td>
                <td className="py-3 px-4 text-gray-400">{src.country}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs ${src.tier === 1 ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                    T{src.tier}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`font-mono ${src.reliability_score >= 0.9 ? 'text-green-400' : src.reliability_score >= 0.8 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {(src.reliability_score * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {src.official_flag && <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300">Official</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`w-2 h-2 rounded-full inline-block ${src.active ? 'bg-green-500' : 'bg-red-500'}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sources.length === 0 && (
          <div className="text-center py-8 text-gray-500">No sources loaded yet. Start the backend to seed initial sources.</div>
        )}
      </div>
    </div>
  );
}
