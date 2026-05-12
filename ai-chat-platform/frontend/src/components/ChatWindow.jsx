import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import MessageBubble from './MessageBubble';
import ModelSelector from './ModelSelector';
import { getChatMessages, sendMessage } from '../services/api';
import { TASK_TYPES, MODELS } from '../utils/models';
import { ThemeContext } from '../App';

const TASK_ICONS = { text: '💬', image: '🎨', video: '🎬' };
const EXAMPLE_PROMPTS = {
  text: ['Explain quantum computing simply', 'Write a short story about AI', 'Summarize the history of the internet'],
  image: ['A cyberpunk city at night, neon lights', 'Watercolor portrait of a fox in a forest', 'Futuristic spacecraft over a purple planet'],
  video: ['Ocean waves crashing at sunset, 4K cinematic', 'Flying through a forest, aerial drone shot', 'City street timelapse at night'],
};

export default function ChatWindow({ chat, onChatUpdated, onToggleSidebar, sidebarOpen, onNewChat }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { theme } = useContext(ThemeContext);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages when chat changes
  useEffect(() => {
    if (!chat?.id) {
      setMessages([]);
      return;
    }
    setLoading(true);
    getChatMessages(chat.id)
      .then(data => {
        setMessages(data.messages || []);
        setSelectedModelId(data.chat?.model_id || null);
      })
      .catch(err => console.error('Load messages error:', err))
      .finally(() => setLoading(false));
  }, [chat?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Focus input when chat loads
  useEffect(() => {
    if (chat && !sending) inputRef.current?.focus();
  }, [chat]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || !chat || sending) return;

    setInput('');
    setSending(true);

    const modelId = selectedModelId || chat.model_id;

    // Optimistic user message
    const tempUserId = 'temp-' + Date.now();
    const tempUserMsg = {
      id: tempUserId,
      role: 'user',
      content: trimmed,
      media_type: chat.task_type,
      model_id: modelId,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const data = await sendMessage(chat.id, trimmed, modelId);

      // Replace temp user message with real one, add assistant reply
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempUserId);
        const newMsgs = [data.userMessage, data.assistantMessage].filter(Boolean);
        return [...withoutTemp, ...newMsgs];
      });

      // Update chat in parent (title may have changed)
      if (data.userMessage) {
        onChatUpdated?.({ ...chat, title: trimmed.substring(0, 60), model_id: modelId });
      }
    } catch (err) {
      // Show error as system message
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempUserId);
        return [...withoutTemp, {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: `⚠️ Error: ${err.message}`,
          media_type: 'text',
          created_at: new Date().toISOString(),
        }];
      });
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, chat, sending, selectedModelId, onChatUpdated]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVideoStatusUpdate = (messageId, status, mediaUrl) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, status, media_url: mediaUrl } : m
    ));
  };

  // === EMPTY STATE (no chat selected) ===
  if (!chat) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${
          theme === 'dark'
            ? 'bg-[#13131f] border-white/5'
            : 'bg-white border-gray-200'
        }`}>
          <button onClick={onToggleSidebar} className={`p-2 rounded-lg transition-colors md:hidden ${
            theme === 'dark'
              ? 'hover:bg-white/5 text-slate-400 hover:text-white'
              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
          }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className={`font-medium ${
            theme === 'dark' ? 'text-slate-300' : 'text-gray-900'
          }`}>AI Chat Platform</h2>
        </div>

        {/* Welcome screen */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl mb-4">✨</div>
          <h2 className={`text-2xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>What do you want to create?</h2>
          <p className={`mb-8 max-w-md ${
            theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
          }`}>
            Generate text, images, and videos using powerful AI models. All your chats are saved.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl">
            {TASK_TYPES.map(task => (
              <button
                key={task.id}
                onClick={onNewChat}
                className={`p-5 rounded-2xl transition-all duration-150 text-left group ${
                  theme === 'dark'
                    ? 'border border-white/10 hover:border-indigo-500/50 bg-white/3 hover:bg-indigo-600/10'
                    : 'border border-gray-200 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50'
                }`}
              >
                <div className="text-3xl mb-3">{task.icon}</div>
                <p className={`font-semibold transition-colors ${
                  theme === 'dark'
                    ? 'text-white group-hover:text-indigo-300'
                    : 'text-gray-900 group-hover:text-indigo-600'
                }`}>{task.name}</p>
                <p className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
                }`}>{task.description}</p>
              </button>
            ))}
          </div>

          <button
            onClick={onNewChat}
            className="mt-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all duration-150 shadow-lg shadow-indigo-600/20"
          >
            Start New Chat
          </button>
        </div>
      </div>
    );
  }

  const taskInfo = TASK_TYPES.find(t => t.id === chat.task_type);
  const availableModels = MODELS[chat.task_type] || [];
  const currentModel = availableModels.find(m => m.id === (selectedModelId || chat.model_id));
  const charLimit = chat.task_type === 'video' ? 500 : null;

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 ${
        theme === 'dark'
          ? 'bg-[#13131f] border-white/5'
          : 'bg-white border-gray-200'
      }`}>
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded-lg transition-colors ${
            theme === 'dark'
              ? 'hover:bg-white/5 text-slate-400 hover:text-white'
              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <span className="text-xl">{TASK_ICONS[chat.task_type]}</span>

        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm truncate ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>{chat.title || 'New Chat'}</p>
          <p className={`text-xs ${
            theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
          }`}>{taskInfo?.name} · {currentModel?.name || chat.model_id}</p>
        </div>

        {/* Model selector */}
        <ModelSelector
          models={availableModels}
          selectedModelId={selectedModelId || chat.model_id}
          onSelect={setSelectedModelId}
        />
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto py-4 ${
        theme === 'dark' ? 'bg-[#0f0f17]' : 'bg-gray-50'
      }`}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className={`text-sm flex items-center gap-2 ${
              theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
            }`}>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Loading messages...
            </div>
          </div>
        ) : messages.length === 0 ? (
          // Empty chat — show example prompts
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="text-4xl mb-3">{taskInfo?.icon}</div>
            <p className={`font-semibold mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{taskInfo?.name} Generation</p>
            <p className={`text-sm mb-6 ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
            }`}>Try one of these prompts to get started</p>
            <div className="flex flex-col gap-2 w-full max-w-md">
              {(EXAMPLE_PROMPTS[chat.task_type] || []).map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                  className={`text-left px-4 py-3 rounded-xl text-sm transition-all duration-150 ${
                    theme === 'dark'
                      ? 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-slate-300'
                      : 'bg-white hover:bg-gray-100 border border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onStatusUpdate={handleVideoStatusUpdate}
              />
            ))}
            {sending && <MessageBubble isLoading={true} message={{ role: 'assistant' }} />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className={`flex-shrink-0 p-4 border-t ${
        theme === 'dark'
          ? 'bg-[#13131f] border-white/5'
          : 'bg-white border-gray-200'
      }`}>
        <div className="relative max-w-4xl mx-auto">
          <div className={`
            flex items-end gap-3 border rounded-2xl px-4 py-3 transition-colors
            ${sending 
              ? theme === 'dark' ? 'border-white/5 bg-[#1e1e30]' : 'border-gray-300 bg-gray-100'
              : theme === 'dark' 
                ? 'border-white/10 focus-within:border-indigo-500/50 bg-[#1e1e30]'
                : 'border-gray-300 focus-within:border-indigo-500 bg-white'
            }
          `}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                chat.task_type === 'text' ? 'Type a message...' :
                chat.task_type === 'image' ? 'Describe the image you want...' :
                'Describe the video you want...'
              }
              disabled={sending}
              rows={1}
              maxLength={charLimit || 2000}
              className={`flex-1 placeholder-opacity-70 text-sm resize-none focus:outline-none min-h-[24px] max-h-32 leading-6 disabled:opacity-50 ${
                theme === 'dark'
                  ? 'bg-transparent text-slate-200 placeholder-slate-500'
                  : 'bg-transparent text-gray-900 placeholder-gray-500'
              }`}
              style={{ height: 'auto' }}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />

            <div className="flex items-center gap-2 flex-shrink-0">
              {charLimit && (
                <span className={`text-xs ${
                  input.length > charLimit * 0.9 
                    ? 'text-orange-400' 
                    : theme === 'dark' ? 'text-slate-600' : 'text-gray-400'
                }`}>
                  {input.length}/{charLimit}
                </span>
              )}

              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="
                  w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150
                  bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed
                  active:scale-95 shadow-lg shadow-indigo-600/30
                "
              >
                {sending ? (
                  <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <p className={`text-xs text-center mt-2 ${
            theme === 'dark' ? 'text-slate-600' : 'text-gray-500'
          }`}>
            Enter to send · Shift+Enter for new line
            {chat.task_type === 'video' && ' · Video generation takes 1-2 minutes'}
          </p>
        </div>
      </div>
    </div>
  );
}
