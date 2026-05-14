import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 300000, // 5 min for video generation
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response.data,
  error => {
    const msg = error.response?.data?.error || error.message || 'Network error';
    return Promise.reject(new Error(msg));
  }
);

// CHATS
export const fetchChats = () => api.get('/chats');
export const createChat = (task_type, model_id) => api.post('/chats', { task_type, model_id });
export const getChatMessages = (chatId) => api.get(`/chats/${chatId}/messages`);
export const deleteChat = (chatId) => api.delete(`/chats/${chatId}`);
export const updateChatTitle = (chatId, title) => api.patch(`/chats/${chatId}`, { title });

// MESSAGES
export const sendMessage = (chatId, content, model_id) =>
  api.post(`/chats/${chatId}/messages`, { content, model_id });

// VIDEO POLLING
export const pollJobStatus = (messageId) => api.get(`/jobs/${messageId}/status`);

// MODELS
export const fetchModels = () => api.get('/models');

// Health
export const checkHealth = () => api.get('/health');

// Build full media URL
// Since backend now returns full fal.ai CDN URLs (https://...), just pass through.
// Falls back gracefully if somehow a relative path is still stored from old data.
export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path; // fal.ai CDN URL — use directly
  // Legacy relative path (old data in DB) — prefix with backend URL
  const backendUrl = import.meta.env.VITE_API_URL || '';
  return `${backendUrl}${path}`;
};
