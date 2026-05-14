const express = require('express');
const router = express.Router();
const {
  listChats,
  createChat,
  getChatMessages,
  deleteChat,
  updateChatTitle,
} = require('../controllers/chatController');
const { sendMessage, pollJobStatus } = require('../controllers/messageController');
const { getUploadsDiskUsage } = require('../services/falService');

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat routes
router.get('/chats', listChats);
router.post('/chats', createChat);
router.get('/chats/:id/messages', getChatMessages);
router.delete('/chats/:id', deleteChat);
router.patch('/chats/:id', updateChatTitle);

// Message routes
router.post('/chats/:id/messages', sendMessage);

// Video polling
router.get('/jobs/:messageId/status', pollJobStatus);

// Admin: disk usage
router.get('/admin/disk-usage', (req, res) => {
  const usage = getUploadsDiskUsage();
  res.json({ success: true, ...usage });
});

// Admin: credits & token usage from fal.ai
router.get('/admin/credits', async (req, res) => {
  try {
    const { fal } = require('@fal-ai/client');
    // Try fetching billing info from fal.ai REST API
    const FAL_KEY = process.env.FAL_KEY || '';
    const response = await fetch('https://api.fal.ai/dashboard/billing', {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Fallback: return partial info
      return res.json({
        success: true,
        balance: null,
        total: null,
        used: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        note: 'Billing API not available',
      });
    }

    const data = await response.json();
    // fal.ai billing response shape varies; try common fields
    const balance = data.balance ?? data.credits ?? data.remaining ?? null;
    const total = data.total ?? data.limit ?? null;
    const used = (total != null && balance != null) ? total - balance : (data.used ?? null);

    return res.json({
      success: true,
      balance,
      total,
      used,
      inputTokens: data.input_tokens ?? data.inputTokens ?? null,
      outputTokens: data.output_tokens ?? data.outputTokens ?? null,
      totalTokens: data.total_tokens ?? data.totalTokens ?? null,
      raw: data,
    });
  } catch (err) {
    console.error('Credits fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Models config (returns all available models)
router.get('/models', (req, res) => {
  res.json({
    success: true,
    models: {
      text: [
        { id: 'fal-ai/claude-haiku', name: 'Claude Haiku', description: 'Fast & efficient for Q&A, summaries', speed: 'Fast', cost: 'Low' },
        { id: 'fal-ai/claude-sonnet', name: 'Claude Sonnet', description: 'Best for long writing & analysis', speed: 'Medium', cost: 'Medium' },
        { id: 'fal-ai/gemini-flash', name: 'Gemini 2.0 Flash', description: 'Multimodal, fast reasoning', speed: 'Fast', cost: 'Low' },
      ],
      image: [
        { id: 'fal-ai/flux/schnell', name: 'FLUX Schnell', description: 'Fast generation, great for previews', speed: 'Fast', cost: '$0.003/img' },
        { id: 'fal-ai/flux-pro', name: 'FLUX.1 Pro', description: 'High quality, photorealistic', speed: 'Medium', cost: '$0.04/img' },
        { id: 'fal-ai/flux-pro/v1.1-ultra', name: 'FLUX Max', description: 'Highest FLUX quality', speed: 'Slow', cost: '$0.07/img' },
        { id: 'fal-ai/imagen4/preview', name: 'Imagen 4 Fast', description: "Google's quality model, fast", speed: 'Fast', cost: '$0.02/img' },
      ],
      video: [
        { id: 'fal-ai/kling-video/v1.6/standard', name: 'Kling Standard', description: 'Good budget 720p video', speed: 'Medium', cost: '$0.22/10s' },
        { id: 'fal-ai/kling-video/v1.6/pro', name: 'Kling Pro', description: 'Premium smooth motion', speed: 'Slow', cost: '$0.52/10s' },
        { id: 'fal-ai/luma-dream-machine', name: 'Luma Dream', description: 'Cinematic, great for creative', speed: 'Slow', cost: '$0.50/10s' },
        { id: 'fal-ai/veo3/fast', name: 'Veo 3 Fast', description: "Google's video model, fast variant", speed: 'Medium', cost: '$0.64/10s' },
      ],
    },
  });
});

module.exports = router;
