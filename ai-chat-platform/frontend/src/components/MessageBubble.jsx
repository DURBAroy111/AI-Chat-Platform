import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { pollJobStatus, getMediaUrl } from '../services/api';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

function ImageMessage({ message }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const url = getMediaUrl(message.media_url);

  return (
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
          <a
            href={url}
            download
            className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Image
          </a>
        </div>
      )}
    </div>
  );
}

function VideoMessage({ message, onStatusUpdate }) {
  const [status, setStatus] = useState(message.status || 'processing');
  const [mediaUrl, setMediaUrl] = useState(message.media_url);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (status === 'processing') {
      intervalRef.current = setInterval(async () => {
        try {
          const data = await pollJobStatus(message.id);
          if (data.status === 'complete') {
            setStatus('complete');
            setMediaUrl(data.media_url);
            onStatusUpdate?.(message.id, 'complete', data.media_url);
            clearInterval(intervalRef.current);
          } else if (data.status === 'error') {
            setStatus('error');
            clearInterval(intervalRef.current);
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 5000);
    }
    return () => clearInterval(intervalRef.current);
  }, [message.id, status]);

  if (status === 'processing') {
    return (
      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center animate-pulse">
            🎬
          </div>
          <div>
            <p className="text-white text-sm font-medium">Generating Video</p>
            <p className="text-slate-400 text-xs">Up to 2 minutes...</p>
          </div>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-1.5">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full animate-pulse w-2/3" />
        </div>
        <p className="text-slate-500 text-xs mt-2 text-center">Checking every 5 seconds</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 max-w-sm">
        <p className="text-red-400 text-sm">⚠️ Video generation failed</p>
      </div>
    );
  }

  const url = getMediaUrl(mediaUrl);
  return (
    <div className="max-w-sm">
      <video
        controls
        src={url}
        className="w-full rounded-xl border border-white/10 shadow-lg"
        preload="metadata"
      />
      <a
        href={url}
        download
        className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Video
      </a>
    </div>
  );
}

export default function MessageBubble({ message, isLoading, onStatusUpdate }) {
  const isUser = message.role === 'user';

  if (isLoading) {
    return (
      <div className="flex items-start gap-3 px-4 py-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
          AI
        </div>
        <div className="bg-[#1e1e30] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3">
          <TypingIndicator />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`
        w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0
        ${isUser ? 'bg-indigo-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}
      `}>
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Content */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`
          rounded-2xl px-4 py-2.5
          ${isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-[#1e1e30] border border-white/5 text-slate-200 rounded-tl-sm'
          }
        `}>
          {message.media_type === 'image' && message.media_url && (
            <ImageMessage message={message} />
          )}
          {message.media_type === 'video' && (
            <VideoMessage message={message} onStatusUpdate={onStatusUpdate} />
          )}
          {(message.media_type === 'text' || (!message.media_url && message.content)) && (
            <div className={isUser ? 'text-white text-sm' : 'prose-dark text-sm'}>
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <ReactMarkdown>{message.content || ''}</ReactMarkdown>
              )}
            </div>
          )}
        </div>

        {/* Model badge for assistant */}
        {!isUser && message.model_id && (
          <p className="text-xs text-slate-600 mt-1 px-1">
            {message.model_id.split('/').pop()}
          </p>
        )}
      </div>
    </div>
  );
}
