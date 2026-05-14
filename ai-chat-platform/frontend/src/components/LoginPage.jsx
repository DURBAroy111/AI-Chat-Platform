import { useState } from 'react';

const LOGIN_CODE = '1632';

export default function LoginPage({ onLogin }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);

  const handleSubmit = () => {
    if (code === LOGIN_CODE) {
      onLogin();
    } else {
      setError('Invalid access code. Please try again.');
      setShaking(true);
      setCode('');
      setTimeout(() => setShaking(false), 600);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleDigit = (d) => {
    if (code.length < 4) {
      const next = code + d;
      setCode(next);
      setError('');
      if (next.length === 4) {
        setTimeout(() => {
          if (next === LOGIN_CODE) {
            onLogin();
          } else {
            setError('Invalid access code. Please try again.');
            setShaking(true);
            setCode('');
            setTimeout(() => setShaking(false), 600);
          }
        }, 120);
      }
    }
  };

  const handleBackspace = () => {
    setCode(prev => prev.slice(0, -1));
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0f0f17] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-2/3 left-1/3 w-[300px] h-[300px] bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-2xl shadow-indigo-500/30 mb-4">
            AI
          </div>
          <h1 className="text-white text-2xl font-bold">AI Chat Platform</h1>
          <p className="text-slate-400 text-sm mt-1">Enter your access code to continue</p>
        </div>

        {/* Card */}
        <div className={`bg-[#13131f] border border-white/8 rounded-3xl p-8 shadow-2xl transition-all ${shaking ? 'animate-shake' : ''}`}>
          {/* Dots display */}
          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  i < code.length
                    ? error
                      ? 'bg-red-500 scale-110'
                      : 'bg-indigo-500 scale-110'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Hidden input for keyboard typing */}
          <input
            type="password"
            inputMode="numeric"
            value={code}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setCode(val);
              setError('');
              if (val.length === 4) {
                setTimeout(() => {
                  if (val === LOGIN_CODE) {
                    onLogin();
                  } else {
                    setError('Invalid access code. Please try again.');
                    setShaking(true);
                    setCode('');
                    setTimeout(() => setShaking(false), 600);
                  }
                }, 120);
              }
            }}
            onKeyDown={handleKeyDown}
            className="sr-only"
            autoFocus
          />

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3,4,5,6,7,8,9].map(d => (
              <button
                key={d}
                onClick={() => handleDigit(String(d))}
                className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-indigo-600/30 active:scale-95 transition-all text-white text-xl font-medium border border-white/5 hover:border-white/15"
              >
                {d}
              </button>
            ))}
            {/* Row 4 */}
            <div /> {/* empty */}
            <button
              onClick={() => handleDigit('0')}
              className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-indigo-600/30 active:scale-95 transition-all text-white text-xl font-medium border border-white/5 hover:border-white/15"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-red-500/20 active:scale-95 transition-all text-slate-400 hover:text-white border border-white/5 hover:border-white/15"
            >
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
              </svg>
            </button>
          </div>

          {/* Error */}
          <div className="h-6 mt-4 flex items-center justify-center">
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={code.length !== 4}
            className="w-full mt-2 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold transition-all active:scale-98 shadow-lg shadow-indigo-600/20"
          >
            Unlock
          </button>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Access restricted · Authorized users only
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
