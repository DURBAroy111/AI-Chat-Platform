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
      // Use VITE_API_URL so this works on Vercel (frontend) hitting the Render backend.
      // Falls back to relative /api for local dev (Vite proxy handles it).
      const base = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${base}/api/admin/credits`);
      const data = await res.json();
      if (data.success) {
        setCredits(data);
      } else {
        setError(data.error || 'Failed to load credits');
      }
    } catch (e) {
      setError('Could not reach server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
    // Refresh credits when a generation completes
    const handler = () => fetchCredits();
    window.addEventListener('fal:generation-complete', handler);
    return () => window.removeEventListener('fal:generation-complete', handler);
  }, []);

  const dark = theme === 'dark';

  const formatUSD = (val) => {
    if (val == null) return '—';
    return `$${Number(val).toFixed(4).replace(/\.?0+$/, '') || '0'}`;
  };

  const formatUSDFull = (val) => {
    if (val == null) return '—';
    return `$${Number(val).toFixed(2)}`;
  };

  const balance = credits?.balance ?? null;

  // Color the balance: green if >$5, yellow if >$1, red if low
  const balanceColor = balance == null
    ? (dark ? 'text-slate-400' : 'text-gray-500')
    : balance > 5
      ? (dark ? 'text-emerald-400' : 'text-emerald-600')
      : balance > 1
        ? (dark ? 'text-yellow-400' : 'text-yellow-600')
        : (dark ? 'text-red-400' : 'text-red-500');

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
          <p className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>
            SOLO AI Credits
            {credits?.username && (
              <span className={`ml-1.5 font-normal ${dark ? 'text-slate-600' : 'text-gray-400'}`}>
                @{credits.username}
              </span>
            )}
          </p>
          {loading ? (
            <div className={`h-3 w-20 rounded mt-0.5 animate-pulse ${dark ? 'bg-white/10' : 'bg-gray-200'}`} />
          ) : error ? (
            <p className="text-xs text-red-400 truncate">{error}</p>
          ) : (
            <p className={`text-xs font-semibold ${balanceColor}`}>
              {formatUSDFull(balance)} remaining
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
              {[1, 2, 3].map(i => (
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
              {/* Balance card */}
              <div className={`rounded-xl px-3 py-3 flex items-center justify-between ${
                dark ? 'bg-white/4' : 'bg-white border border-gray-100'
              }`}>
                <div>
                  <p className={`text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Available Balance</p>
                  <p className={`text-2xl font-bold mt-0.5 ${balanceColor}`}>
                    {formatUSDFull(balance)}
                  </p>
                  <p className={`text-xs mt-0.5 ${dark ? 'text-slate-600' : 'text-gray-400'}`}>
                    {credits.currency || 'USD'} · Live from SOLO AI
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  dark ? 'bg-emerald-500/15' : 'bg-emerald-50'
                }`}>
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              {/* Low balance warning */}
              {balance != null && balance < 1 && (
                <div className={`rounded-xl px-3 py-2 flex items-center gap-2 ${
                  dark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
                }`}>
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className={`text-xs ${dark ? 'text-red-300' : 'text-red-600'}`}>
                    Low balance — top up at SOLO AI/dashboard
                  </p>
                </div>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); fetchCredits(); }}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors w-full justify-center ${
                  dark ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Balance
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
