import { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../App';

export default function CreditsPanel() {
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const { theme } = useContext(ThemeContext);

  const fetchCredits = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/credits');
      const data = await res.json();
      if (data.success) {
        setCredits(data);
      } else {
        setError(data.error || 'Failed to load');
      }
    } catch (e) {
      setError('Could not reach server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCredits(); }, []);

  const dark = theme === 'dark';

  const formatUSD = (val) => {
    if (val == null) return '—';
    return `$${Number(val).toFixed(2)}`;
  };

  const usagePercent = credits
    ? Math.min(100, ((credits.used / (credits.total || 1)) * 100))
    : 0;

  const barColor = usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
      dark
        ? 'bg-[#1a1a2e] border-white/8'
        : 'bg-gray-50 border-gray-200'
    }`}>
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
          dark ? 'hover:bg-white/3' : 'hover:bg-gray-100'
        }`}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          dark ? 'bg-emerald-500/15' : 'bg-emerald-50'
        }`}>
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>Credits</p>
          {loading ? (
            <div className={`h-3 w-16 rounded mt-0.5 animate-pulse ${dark ? 'bg-white/10' : 'bg-gray-200'}`} />
          ) : error ? (
            <p className="text-xs text-red-400 truncate">{error}</p>
          ) : (
            <p className={`text-xs font-semibold ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {formatUSD(credits?.balance)} remaining
            </p>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''} ${dark ? 'text-slate-500' : 'text-gray-400'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className={`px-4 pb-4 border-t ${dark ? 'border-white/5' : 'border-gray-200'}`}>
          {loading ? (
            <div className="space-y-2 pt-3">
              {[1,2,3].map(i => (
                <div key={i} className={`h-3 rounded animate-pulse ${dark ? 'bg-white/8' : 'bg-gray-200'}`} style={{ width: `${60 + i * 10}%` }} />
              ))}
            </div>
          ) : error ? (
            <div className="pt-3">
              <p className={`text-xs ${dark ? 'text-slate-500' : 'text-gray-500'}`}>{error}</p>
              <button
                onClick={(e) => { e.stopPropagation(); fetchCredits(); }}
                className={`mt-2 text-xs px-3 py-1 rounded-lg transition-colors ${
                  dark ? 'bg-white/8 hover:bg-white/12 text-slate-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Retry
              </button>
            </div>
          ) : credits ? (
            <div className="pt-3 space-y-3">
              {/* Usage bar */}
              {credits.total != null && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={dark ? 'text-slate-500' : 'text-gray-500'}>Used</span>
                    <span className={dark ? 'text-slate-400' : 'text-gray-600'}>
                      {formatUSD(credits.used)} / {formatUSD(credits.total)}
                    </span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full ${dark ? 'bg-white/8' : 'bg-gray-200'}`}>
                    <div
                      className={`h-1.5 rounded-full transition-all ${barColor}`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${dark ? 'text-slate-600' : 'text-gray-400'}`}>
                    {usagePercent.toFixed(1)}% used
                  </p>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                <StatBox label="Balance" value={formatUSD(credits.balance)} dark={dark} color="emerald" />
                <StatBox label="Total Tokens" value={credits.totalTokens != null ? fmtNum(credits.totalTokens) : '—'} dark={dark} color="indigo" />
                <StatBox label="Input Tokens" value={credits.inputTokens != null ? fmtNum(credits.inputTokens) : '—'} dark={dark} color="blue" />
                <StatBox label="Output Tokens" value={credits.outputTokens != null ? fmtNum(credits.outputTokens) : '—'} dark={dark} color="purple" />
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); fetchCredits(); }}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors w-full justify-center ${
                  dark ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, dark, color }) {
  const colors = {
    emerald: dark ? 'text-emerald-400' : 'text-emerald-600',
    indigo:  dark ? 'text-indigo-400'  : 'text-indigo-600',
    blue:    dark ? 'text-blue-400'    : 'text-blue-600',
    purple:  dark ? 'text-purple-400'  : 'text-purple-600',
  };
  return (
    <div className={`rounded-xl px-3 py-2 ${dark ? 'bg-white/4' : 'bg-white border border-gray-100'}`}>
      <p className={`text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${colors[color]}`}>{value}</p>
    </div>
  );
}

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
