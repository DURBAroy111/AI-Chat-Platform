const { pool } = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const {
  generateText,
  generateImage,
  submitVideoJob,
  checkVideoStatus,
  deleteLocalFile,
} = require('../services/falService');

// POST /chats/:id/messages - send a message
const sendMessage = async (req, res) => {
  const { id: chatId } = req.params;
  const { content, model_id } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, error: 'Message content is required' });
  }

  try {
    const [chats] = await pool.execute('SELECT * FROM chats WHERE id = ?', [chatId]);
    if (!chats.length) return res.status(404).json({ success: false, error: 'Chat not found' });

    const chat = chats[0];
    const activeModelId = model_id || chat.model_id;

    // Save user message
    const userMsgId = uuidv4();
    await pool.execute(
      'INSERT INTO messages (id, chat_id, role, content, media_type, model_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userMsgId, chatId, 'user', content.trim(), chat.task_type, activeModelId]
    );

    // Auto-title from first user message
    const [msgCount] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM messages WHERE chat_id = ? AND role = "user"',
      [chatId]
    );
    let chatTitle = chat.title;
    if (msgCount[0].cnt === 1) {
      chatTitle = content.trim().substring(0, 60);
      await pool.execute('UPDATE chats SET title = ? WHERE id = ?', [chatTitle, chatId]);
    }

    await pool.execute('UPDATE chats SET updated_at = NOW(), model_id = ? WHERE id = ?', [activeModelId, chatId]);

    const userMessage = {
      id: userMsgId, chat_id: chatId, role: 'user',
      content: content.trim(), media_type: chat.task_type,
      model_id: activeModelId, created_at: new Date().toISOString(),
    };

    // ── TEXT ──────────────────────────────────────────────────────────────────
    if (chat.task_type === 'text') {
      try {
        const [history] = await pool.execute(
          `SELECT role, content FROM messages WHERE chat_id = ? AND id != ? ORDER BY created_at ASC LIMIT 20`,
          [chatId, userMsgId]
        );

        const { text: replyText, costUsd } = await generateText(activeModelId, content.trim(), history);

        const replyId = uuidv4();
        await pool.execute(
          'INSERT INTO messages (id, chat_id, role, content, media_type, model_id, cost_usd) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [replyId, chatId, 'assistant', replyText, 'text', activeModelId, costUsd ?? null]
        );

        return res.json({
          success: true, userMessage, chatTitle,
          assistantMessage: {
            id: replyId, chat_id: chatId, role: 'assistant',
            content: replyText, media_type: 'text',
            model_id: activeModelId, cost_usd: costUsd ?? null,
            created_at: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error('Text generation error:', err);
        const errId = uuidv4();
        const errText = `⚠️ Error generating response: ${err.message}`;
        await pool.execute(
          'INSERT INTO messages (id, chat_id, role, content, media_type, model_id) VALUES (?, ?, ?, ?, ?, ?)',
          [errId, chatId, 'assistant', errText, 'text', activeModelId]
        );
        return res.json({ success: false, userMessage, chatTitle,
          assistantMessage: { id: errId, role: 'assistant', content: errText, media_type: 'text', created_at: new Date().toISOString() },
        });
      }
    }

    // ── IMAGE ─────────────────────────────────────────────────────────────────
    if (chat.task_type === 'image') {
      try {
        const { url: imagePath, costUsd } = await generateImage(activeModelId, content.trim());

        const replyId = uuidv4();
        await pool.execute(
          'INSERT INTO messages (id, chat_id, role, content, media_url, media_type, model_id, status, cost_usd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [replyId, chatId, 'assistant', null, imagePath, 'image', activeModelId, 'complete', costUsd ?? null]
        );

        return res.json({
          success: true, userMessage, chatTitle,
          assistantMessage: {
            id: replyId, chat_id: chatId, role: 'assistant',
            content: null, media_url: imagePath, media_type: 'image',
            model_id: activeModelId, status: 'complete',
            cost_usd: costUsd ?? null,
            created_at: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error('Image generation error:', err);
        const errId = uuidv4();
        const errText = `⚠️ Image generation failed: ${err.message}`;
        await pool.execute(
          'INSERT INTO messages (id, chat_id, role, content, media_type, model_id) VALUES (?, ?, ?, ?, ?, ?)',
          [errId, chatId, 'assistant', errText, 'text', activeModelId]
        );
        return res.json({ success: false, userMessage, chatTitle,
          assistantMessage: { id: errId, role: 'assistant', content: errText, media_type: 'text', created_at: new Date().toISOString() },
        });
      }
    }

    // ── VIDEO ─────────────────────────────────────────────────────────────────
    if (chat.task_type === 'video') {
      try {
        const jobId = await submitVideoJob(activeModelId, content.trim());

        const replyId = uuidv4();
        await pool.execute(
          'INSERT INTO messages (id, chat_id, role, content, media_type, model_id, job_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [replyId, chatId, 'assistant', null, 'video', activeModelId, jobId, 'processing']
        );

        return res.json({
          success: true, userMessage, chatTitle,
          assistantMessage: {
            id: replyId, chat_id: chatId, role: 'assistant',
            content: null, media_type: 'video',
            model_id: activeModelId, job_id: jobId, status: 'processing',
            created_at: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error('Video submission error:', err);
        const errId = uuidv4();
        const errText = `⚠️ Video job submission failed: ${err.message}`;
        await pool.execute(
          'INSERT INTO messages (id, chat_id, role, content, media_type, model_id) VALUES (?, ?, ?, ?, ?, ?)',
          [errId, chatId, 'assistant', errText, 'text', activeModelId]
        );
        return res.json({ success: false, userMessage, chatTitle,
          assistantMessage: { id: errId, role: 'assistant', content: errText, media_type: 'text', created_at: new Date().toISOString() },
        });
      }
    }

    res.status(400).json({ success: false, error: 'Unknown task type' });
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /jobs/:messageId/status - poll video job status
const pollJobStatus = async (req, res) => {
  const { messageId } = req.params;

  try {
    const [messages] = await pool.execute('SELECT * FROM messages WHERE id = ?', [messageId]);
    if (!messages.length) return res.status(404).json({ success: false, error: 'Message not found' });

    const message = messages[0];

    if (message.status === 'complete') {
      return res.json({ success: true, status: 'complete', media_url: message.media_url, cost_usd: message.cost_usd ?? null });
    }

    if (message.status === 'error') {
      return res.json({ success: false, status: 'error', error: 'Video generation failed' });
    }

    // Still processing — check fal.ai
    const [chats] = await pool.execute('SELECT model_id FROM chats WHERE id = ?', [message.chat_id]);
    const modelId = chats[0]?.model_id;

    const result = await checkVideoStatus(modelId, message.job_id);

    if (result.status === 'complete') {
      await pool.execute(
        'UPDATE messages SET media_url = ?, status = "complete", cost_usd = ? WHERE id = ?',
        [result.media_url, result.costUsd ?? null, messageId]
      );
      return res.json({ success: true, status: 'complete', media_url: result.media_url, cost_usd: result.costUsd ?? null });
    }

    if (result.status === 'error') {
      await pool.execute('UPDATE messages SET status = "error" WHERE id = ?', [messageId]);
      return res.json({ success: false, status: 'error', error: result.error });
    }

    return res.json({ success: true, status: 'processing' });
  } catch (err) {
    console.error('pollJobStatus error:', err);
    res.status(500).json({ success: false, error: 'Failed to check job status' });
  }
};

module.exports = { sendMessage, pollJobStatus };
