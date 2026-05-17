import { useState, useEffect, useRef, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import { pollJobStatus, getMediaUrl } from '../services/api';
import { getModelName } from '../utils/models';
import { getModelPricing, toEndpointId, formatCost } from '../utils/modelPricing';
import { ThemeContext } from '../App';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

// Static fallback costs — sourced from official fal.ai model pages (used while live pricing loads)
// Image models: billed per image (at ~1MP / standard resolution)
// Video models: billed per second of output video
const IMAGE_COSTS_FALLBACK = {
  'fal-ai/flux/schnell':        { price: 0.003, unit: 'image' }, // $0.003/megapixel · fal.ai/models/fal-ai/flux/schnell
  'fal-ai/flux-pro':            { price: 0.040, unit: 'image' }, // $0.04/megapixel  · fal.ai/models/fal-ai/flux-pro/v1.1
  'fal-ai/flux-pro/v1.1-ultra': { price: 0.060, unit: 'image' }, // $0.06/image      · fal.ai/models/fal-ai/flux-pro/v1.1-ultra
  'fal-ai/imagen4/preview':     { price: 0.020, unit: 'image' }, // $0.02/image      · fal.ai/models/fal-ai/imagen4/preview
};
// Video: price per second, duration used for 5-second clip (app default)
const VIDEO_DEFAULT_DURATION_S = 5;
const VIDEO_COSTS_FALLBACK = {
  // Kling v1.6 Standard: $0.056/second → 5s ≈ $0.28
  'fal-ai/kling-video/v1.6/standard': { price: 0.056, unit: 'second', duration: VIDEO_DEFAULT_DURATION_S },
  // Kling v1.6 Pro: $0.098/second → 5s ≈ $0.49
  'fal-ai/kling-video/v1.6/pro':      { price: 0.098, unit: 'second', duration: VIDEO_DEFAULT_DURATION_S },
  // Luma Dream Machine: $0.50 per video (flat rate)
  'fal-ai/luma-dream-machine':         { price: 0.50,  unit: 'video' },
  // Veo 3 Fast: $0.25/second (with audio) → 8s clip ≈ $2.00; $0.10/s without audio
  'fal-ai/veo3/fast':                  { price: 0.25,  unit: 'second', duration: 8 },
};

function useLiveCost(modelId) {
  const [cost, setCost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!modelId) { setLoading(false); return; }
    const endpointId = toEndpointId(modelId);
    getModelPricing().then(pricing => {
      const entry = pricing[endpointId];
      if (entry) {
        const fb = VIDEO_COSTS_FALLBACK[modelId];
        setCost({
          price: entry.unit_price,
          unit: entry.unit,
          duration: fb?.duration ?? null, // carry known duration for per-second models
          live: true,
        });
      } else {
        // Fall back to static table
        const fb = IMAGE_COSTS_FALLBACK[modelId] || VIDEO_COSTS_FALLBACK[modelId];
        if (fb) setCost({ ...fb, live: false });
      }
      setLoading(false);
    });
  }, [modelId]);

  return { cost, loading };
}

// Compute the dollar amount for a generation given cost info
function computeCostAmount(cost) {
  if (!cost) return null;
  if (cost.unit === 'actual') return cost.price; // real cost from fal.ai response
  if (cost.unit === 'image') return cost.price;
  if (cost.unit === 'video') return cost.price;
  if (cost.unit === 'second' && cost.duration) return cost.price * cost.duration;
  return cost.price;
}

function formatCostLabel(cost) {
  if (!cost) return null;
  const amount = computeCostAmount(cost);
  if (amount == null) return null;
  if (cost.real) return `$${amount.toFixed(4)}`; // exact billed amount
  if (cost.unit === 'second' && cost.duration) {
    return `~$${amount.toFixed(3)} (${cost.duration}s @ $${cost.price}/s)`;
  }
  return `~$${amount.toFixed(3)}`; // estimate prefix
}

function CreditBadge({ label, dark, live }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
      dark
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
    }`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {label}
      {live && (
        <span className={`w-1.5 h-1.5 rounded-full ${dark ? 'bg-emerald-400' : 'bg-emerald-500'}`} title="Live pricing from fal.ai" />
      )}
    </span>
  );
}

function ImageMessage({ message }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const { theme } = useContext(ThemeContext);
  const url = getMediaUrl(message.media_url);
  const dark = theme === 'dark';
  const { cost, loading: costLoading } = useLiveCost(message.model_id);

  const costLabel = cost ? formatCostLabel(cost) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative max-w-sm">
        {!loaded && !error && (
          <div className="w-72 h-48 rounded-xl shimmer flex items-center justify-center">
            <span className="text-slate-500 text-sm">Generating image...</span>
          </div>
        )}
        {error ? (
          <div className="w-72 h-24 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <p className="text-red-400 text-sm">Failed to load image</p>
          </div>
        ) : (
          <div className={loaded ? '' : 'hidden'}>
            <img
              src={url}
              alt="AI generated"
              className="max-w-full rounded-xl border border-white/10 shadow-lg cursor-zoom-in"
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              onClick={() => window.open(url, '_blank')}
            />
            <div className="flex items-center justify-between mt-2">
              <a
                href={url}
                download
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  dark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
              {costLabel && loaded && <CreditBadge label={`${costLabel} used`} dark={dark} live={cost?.live} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VideoMessage({ message, onStatusUpdate }) {
  const [status, setStatus] = useState(message.status || 'processing');
  const [mediaUrl, setMediaUrl] = useState(message.media_url);
  const [elapsed, setElapsed] = useState(0);
  const [dots, setDots] = useState(0);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const dotsRef = useRef(null);
  const { theme } = useContext(ThemeContext);
  const dark = theme === 'dark';
  const { cost } = useLiveCost(message.model_id);
  const costLabel = cost ? formatCostLabel(cost) : null;

  useEffect(() => {
    if (status === 'processing') {
      // Elapsed timer
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      // Animated dots
      dotsRef.current = setInterval(() => setDots(d => (d + 1) % 4), 500);
      // Poll job
      intervalRef.current = setInterval(async () => {
        try {
          const data = await pollJobStatus(message.id);
          if (data.status === 'complete') {
            setStatus('complete');
            setMediaUrl(data.media_url);
            onStatusUpdate?.(message.id, 'complete', data.media_url, data.cost_usd ?? null);
            clearInterval(intervalRef.current);
            clearInterval(timerRef.current);
            clearInterval(dotsRef.current);
          } else if (data.status === 'error') {
            setStatus('error');
            clearInterval(intervalRef.current);
            clearInterval(timerRef.current);
            clearInterval(dotsRef.current);
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 5000);
    }
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
      clearInterval(dotsRef.current);
    };
  }, [message.id, status]);

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  if (status === 'processing') {
    const dotStr = '.'.repeat(dots);
    const pct = Math.min(95, (elapsed / 120) * 100);
    return (
      <div className={`rounded-2xl p-4 max-w-xs border ${
        dark
          ? 'bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/20'
          : 'bg-orange-50 border-orange-200'
      }`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
            dark ? 'bg-orange-500/15' : 'bg-orange-100'
          }`}>
            🎬
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
              Generating Video{dotStr}
            </p>
            <p className={`text-xs ${dark ? 'text-orange-400' : 'text-orange-600'}`}>
              {getModelName(message.model_id)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className={`w-full h-2 rounded-full overflow-hidden ${dark ? 'bg-white/8' : 'bg-orange-100'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Stats row */}
        <div className={`flex items-center justify-between mt-2 text-xs ${dark ? 'text-slate-500' : 'text-gray-500'}`}>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {fmtTime(elapsed)} elapsed
          </span>
          <span>~{Math.round(pct)}%</span>
        </div>

        {/* Tips */}
        <div className={`mt-3 px-3 py-2 rounded-xl text-xs ${
          dark ? 'bg-white/4 text-slate-500' : 'bg-orange-50 text-orange-700'
        }`}>
          💡 Video generation takes 1–2 minutes. You can browse other chats while waiting.
        </div>

        {costLabel && (
          <div className="mt-2 flex justify-end">
            <span className={`text-xs ${dark ? 'text-slate-600' : 'text-gray-400'}`}>
              Est. cost: {costLabel}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 max-w-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">⚠️</span>
          <p className="text-red-400 text-sm font-medium">Video generation failed</p>
        </div>
        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
          Try again with a different prompt or model.
        </p>
      </div>
    );
  }

  const url = getMediaUrl(mediaUrl);
  return (
    <div className="max-w-sm flex flex-col gap-2">
      <video
        controls
        src={url}
        className="w-full rounded-xl border border-white/10 shadow-lg"
        preload="metadata"
      />
      <div className="flex items-center justify-between">
        <a
          href={url}
          download
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Video
        </a>
        {costLabel && <CreditBadge label={costLabel} dark={theme === 'dark'} live={cost?.live} />}
      </div>
    </div>
  );
}

export default function MessageBubble({ message, isLoading, onStatusUpdate }) {
  const isUser = message.role === 'user';
  const { theme } = useContext(ThemeContext);
  const dark = theme === 'dark';

  if (isLoading) {
    return (
      <div className="flex items-start gap-3 px-4 py-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
          AI
        </div>
        <div className={`rounded-2xl rounded-tl-sm px-4 py-3 ${
          dark
            ? 'bg-[#1e1e30] border border-white/5'
            : 'bg-white border border-gray-200'
        }`}>
          <TypingIndicator />
        </div>
      </div>
    );
  }

  // Token usage for text messages
  const tokens = message.tokens_used || message.token_count || null;
  const inputTok = message.input_tokens || null;
  const outputTok = message.output_tokens || null;

  // Real cost from DB (set by backend after fal.ai response)
  const realCostUsd = message.cost_usd != null ? Number(message.cost_usd) : null;

  // Credit cost hook — used as fallback estimate when real cost isn't available
  const { cost: msgCostEstimate } = useLiveCost(!isUser && realCostUsd == null ? message.model_id : null);
  
  // Prefer real cost; fall back to estimate
  const msgCost = realCostUsd != null
    ? { price: realCostUsd, unit: 'actual', live: false, real: true }
    : msgCostEstimate;

  return (
    <div className={`flex items-start gap-3 px-4 py-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`
        w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 text-white
        ${isUser ? 'bg-indigo-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}
      `}>
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Content */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`
          rounded-2xl px-4 py-2.5
          ${isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : dark
              ? 'bg-[#1e1e30] border border-white/5 text-slate-200 rounded-tl-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
          }
        `}>
          {message.media_type === 'image' && message.media_url && (
            <ImageMessage message={message} />
          )}
          {message.media_type === 'video' && (
            <VideoMessage message={message} onStatusUpdate={onStatusUpdate} />
          )}
          {(message.media_type === 'text' || (!message.media_url && message.content)) && (
            <div className={`text-sm ${isUser ? 'text-white' : dark ? 'text-slate-200' : 'text-gray-800'}`}>
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className={`prose prose-sm max-w-none ${
                  dark
                    ? 'prose-invert prose-p:text-slate-200 prose-headings:text-white prose-strong:text-white prose-code:text-indigo-300'
                    : 'prose-p:text-gray-800 prose-headings:text-gray-900'
                }`}>
                  <ReactMarkdown>{message.content || ''}</ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: model name + credit/token usage — shown under every AI message */}
        {!isUser && (
          <div className={`flex items-center gap-2 flex-wrap px-1`}>
            {message.model_id && (
              <p className={`text-xs ${dark ? 'text-slate-600' : 'text-gray-400'}`}>
                {getModelName(message.model_id)}
              </p>
            )}

            {/* Text messages: show token info if available */}
            {message.media_type === 'text' && tokens != null && (
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                dark
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              }`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {tokens.toLocaleString()} tokens
              </span>
            )}
            {message.media_type === 'text' && inputTok != null && outputTok != null && (
              <span className={`text-xs ${dark ? 'text-slate-600' : 'text-gray-400'}`}>
                ↑{inputTok.toLocaleString()} ↓{outputTok.toLocaleString()}
              </span>
            )}

            {/* Credit cost badge — real billed amount if available, otherwise estimate for image/video */}
            {msgCost && message.status !== 'processing' && (msgCost.real || message.media_type === 'image' || message.media_type === 'video') && (() => {
              const label = formatCostLabel(msgCost);
              if (!label) return null;
              return (
                <span className={`inline-flex items-center gap-1 text-[11px] ${
                  dark ? 'text-slate-600' : 'text-gray-400'
                }`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {label} {msgCost.real ? 'billed' : 'est.'}
                  {msgCost.live && !msgCost.real && (
                    <span className={`w-1.5 h-1.5 rounded-full ml-0.5 ${dark ? 'bg-emerald-400' : 'bg-emerald-500'}`} title="Live price from fal.ai" />
                  )}
                  {msgCost.real && (
                    <span className={`w-1.5 h-1.5 rounded-full ml-0.5 ${dark ? 'bg-blue-400' : 'bg-blue-500'}`} title="Actual billed amount from fal.ai" />
                  )}
                </span>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

