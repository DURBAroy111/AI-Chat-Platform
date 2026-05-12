const { pool } = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const { deleteLocalFile } = require('../services/falService');

// GET /chats - list all chats
const listChats = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM chats ORDER BY updated_at DESC'
    );
    res.json({ success: true, chats: rows });
  } catch (err) {
    console.error('listChats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch chats' });
  }
};

// POST /chats - create new chat
const createChat = async (req, res) => {
  const { task_type = 'text', model_id } = req.body;
  if (!model_id) {
    return res.status(400).json({ success: false, error: 'model_id is required' });
  }

  const id = uuidv4();
  try {
    await pool.execute(
      'INSERT INTO chats (id, title, task_type, model_id) VALUES (?, ?, ?, ?)',
      [id, 'New Chat', task_type, model_id]
    );
    const [rows] = await pool.execute('SELECT * FROM chats WHERE id = ?', [id]);
    res.status(201).json({ success: true, chat: rows[0] });
  } catch (err) {
    console.error('createChat error:', err);
    res.status(500).json({ success: false, error: 'Failed to create chat' });
  }
};

// GET /chats/:id/messages - load chat history
const getChatMessages = async (req, res) => {
  const { id } = req.params;
  try {
    const [chat] = await pool.execute('SELECT * FROM chats WHERE id = ?', [id]);
    if (!chat.length) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const [messages] = await pool.execute(
      'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
      [id]
    );
    res.json({ success: true, chat: chat[0], messages });
  } catch (err) {
    console.error('getChatMessages error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
};

// DELETE /chats/:id - delete chat + messages + files
const deleteChat = async (req, res) => {
  const { id } = req.params;
  try {
    // Get all messages with media files
    const [messages] = await pool.execute(
      'SELECT media_url FROM messages WHERE chat_id = ? AND media_url IS NOT NULL',
      [id]
    );

    // Delete local files
    messages.forEach(msg => {
      if (msg.media_url) deleteLocalFile(msg.media_url);
    });

    // Delete from DB (cascade deletes messages)
    const [result] = await pool.execute('DELETE FROM chats WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    res.json({ success: true, message: 'Chat deleted' });
  } catch (err) {
    console.error('deleteChat error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete chat' });
  }
};

// PATCH /chats/:id - update chat title
const updateChatTitle = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  try {
    await pool.execute('UPDATE chats SET title = ? WHERE id = ?', [title, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update title' });
  }
};

module.exports = { listChats, createChat, getChatMessages, deleteChat, updateChatTitle };
