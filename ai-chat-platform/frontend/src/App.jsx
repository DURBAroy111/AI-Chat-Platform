import { useState, useEffect, useCallback, createContext } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import NewChatModal from './components/NewChatModal';
import { fetchChats, createChat, deleteChat } from './services/api';

export const ThemeContext = createContext();

export default function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  // Load all chats from MySQL on start
  const loadChats = useCallback(async () => {
    try {
      const data = await fetchChats();
      const loadedChats = data.chats || [];
      setChats(loadedChats);

      // Restore last active chat from localStorage
      const lastChatId = localStorage.getItem('lastActiveChatId');
      if (lastChatId && loadedChats.find(c => c.id === lastChatId)) {
        setActiveChatId(lastChatId);
      } else if (loadedChats.length > 0 && !lastChatId) {
        // Auto-select the most recent chat on first load
        // (don't auto-select on refresh if no saved preference)
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);

  const handleNewChat = async (taskType, modelId) => {
    try {
      const data = await createChat(taskType, modelId);
      const newChat = data.chat;
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      localStorage.setItem('lastActiveChatId', newChat.id);
      setShowNewChatModal(false);
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await deleteChat(chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        localStorage.removeItem('lastActiveChatId');
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
    localStorage.setItem('lastActiveChatId', chatId);
    // Close sidebar on mobile
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  // Called by ChatWindow after a message is sent — updates title + timestamp in sidebar
  const handleChatUpdated = useCallback((updatedChatFields) => {
    setChats(prev => prev.map(c =>
      c.id === updatedChatFields.id
        ? { ...c, ...updatedChatFields, updated_at: new Date().toISOString() }
        : c
    ));
  }, []);

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`flex h-screen overflow-hidden ${
        theme === 'dark'
          ? 'bg-[#0f0f17]'
          : 'bg-white'
      }`}>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className={`fixed inset-0 z-20 md:hidden ${
              theme === 'dark' ? 'bg-black/50' : 'bg-black/30'
            }`}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed md:relative z-30 md:z-auto h-full
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${sidebarOpen ? 'w-72' : 'w-0 md:w-72'}
        `}>
          <Sidebar
            chats={chats}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
            onNewChat={() => setShowNewChatModal(true)}
            loading={loading}
          />
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatWindow
            chat={activeChat}
            onChatUpdated={handleChatUpdated}
            onToggleSidebar={() => setSidebarOpen(s => !s)}
            sidebarOpen={sidebarOpen}
            onNewChat={() => setShowNewChatModal(true)}
          />
        </div>

        {/* New Chat Modal */}
        {showNewChatModal && (
          <NewChatModal
            onClose={() => setShowNewChatModal(false)}
            onCreate={handleNewChat}
          />
        )}
      </div>
    </ThemeContext.Provider>
  );
}
