import { useState, useRef, useEffect } from 'react';
import { getModelName } from '../utils/models';

export default function ModelSelector({ models, selectedModelId, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Find selected model — match on id (which is now unique per model)
  const selected = models.find(m => m.id === selectedModelId) || models[0];

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!models.length) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs transition-colors"
      >
        <span className="max-w-[100px] truncate">
          {selected?.name || getModelName(selectedModelId) || 'Model'}
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl z-50 min-w-[240px] overflow-hidden">
          <div className="p-1">
            {models.map(model => (
              <button
                key={model.id}
                onClick={() => { onSelect(model.id); setOpen(false); }}
                className={`
                  w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between gap-3
                  ${selectedModelId === model.id
                    ? 'bg-indigo-600/20 text-white'
                    : 'text-slate-300 hover:bg-white/5'
                  }
                `}
              >
                <div>
                  <p className="text-sm font-medium">{model.name}</p>
                  <p className="text-xs text-slate-500">{model.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-400">{model.cost}</p>
                  {selectedModelId === model.id && (
                    <svg className="w-3.5 h-3.5 text-indigo-400 ml-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
