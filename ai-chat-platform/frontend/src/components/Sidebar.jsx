import { useState, useContext } from 'react';
import { ThemeContext } from '../App';

const TASK_ICONS = { text: '💬', image: '🎨', video: '🎬' };

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Sidebar({ chats, activeChatId, onSelectChat, onDeleteChat, onNewChat, loading }) {
  const [hoveredChat, setHoveredChat] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { theme, toggleTheme } = useContext(ThemeContext);

  const handleDelete = async (e, chatId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat and all its messages?')) return;
    setDeletingId(chatId);
    await onDeleteChat(chatId);
    setDeletingId(null);
  };

  return (
    <div className={`flex flex-col h-full w-72 ${
      theme === 'dark'
        ? 'bg-[#13131f] border-white/5'
        : 'bg-white border-gray-200'
    } border-r`}>
      {/* Header */}
      <div className={`p-4 border-b ${
        theme === 'dark' 
          ? 'border-white/5' 
          : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg">
            AI
          </div>
          <div>
            <h1 className={`text-sm font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>AI Chat Platform</h1>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
            }`}>Powered by fal.ai</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all duration-150 shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl transition-all duration-150 ${
              theme === 'dark'
                ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 18a6 6 0 100-12 6 6 0 000 12zM12 2v4m0 12v4m10-10h-4M4 12H0m15.657-6.657l-2.828 2.829m0 8.656l2.828 2.829M6.343 6.343L3.515 3.515m0 8.656l2.828 2.829" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-xl shimmer" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <div className="text-4xl mb-3">✨</div>
            <p className={`text-sm font-medium ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
            }`}>No chats yet</p>
            <p className={`text-xs mt-1 ${
              theme === 'dark' ? 'text-slate-600' : 'text-gray-400'
            }`}>Click "New Chat" to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                onMouseEnter={() => setHoveredChat(chat.id)}
                onMouseLeave={() => setHoveredChat(null)}
                className={`
                  w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 group relative
                  ${activeChatId === chat.id
                    ? `${
                      theme === 'dark'
                        ? 'bg-indigo-600/20 border border-indigo-500/30 text-white'
                        : 'bg-indigo-50 border border-indigo-300 text-gray-900'
                    }`
                    : `${
                      theme === 'dark'
                        ? 'hover:bg-white/5 text-slate-300 border border-transparent'
                        : 'hover:bg-gray-100 text-gray-600 border border-transparent'
                    }`
                  }
                `}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base flex-shrink-0" title={chat.task_type}>
                    {TASK_ICONS[chat.task_type] || '💬'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {chat.title || 'New Chat'}
                    </p>
                    <p className={`text-xs truncate ${
                      theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
                    }`}>
                      {timeAgo(chat.updated_at || chat.created_at)}
                    </p>
                  </div>

                  {/* Delete button */}
                  {(hoveredChat === chat.id || activeChatId === chat.id) && (
                    <button
                      onClick={(e) => handleDelete(e, chat.id)}
                      disabled={deletingId === chat.id}
                      className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-red-500/20 text-slate-500 hover:text-red-400'
                          : 'hover:bg-red-100 text-gray-500 hover:text-red-600'
                      }`}
                    >
                      {deletingId === chat.id ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`p-4 border-t ${
        theme === 'dark' 
          ? 'border-white/5' 
          : 'border-gray-200'
      }`}>
        <div className={`text-xs text-center ${
          theme === 'dark' ? 'text-slate-600' : 'text-gray-500'
        }`}>
          Chats saved in MySQL · Files in /uploads
        </div>
      </div>
    </div>
  );
}
