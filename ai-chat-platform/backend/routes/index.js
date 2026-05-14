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
    const FAL_KEY = process.env.FAL_KEY || '';
    // Official fal.ai Platform API: GET /v1/account/billing?expand=credits
    const response = await fetch('https://api.fal.ai/v1/account/billing?expand=credits', {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('fal.ai billing API error:', response.status, errText);
      return res.status(response.status).json({
        success: false,
        error: `fal.ai billing API returned ${response.status}`,
        detail: errText,
      });
    }

    const data = await response.json();
    // Response shape: { username, credits: { current_balance, currency } }
    const balance = data.credits?.current_balance ?? null;
    const currency = data.credits?.currency ?? 'USD';

    return res.json({
      success: true,
      username: data.username ?? null,
      balance,
      currency,
      raw: data,
    });
  } catch (err) {
    console.error('Credits fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: fetch real unit pricing from fal.ai for models used in this app
router.get('/admin/model-pricing', async (req, res) => {
  try {
    const FAL_KEY = process.env.FAL_KEY || '';
    const modelIds = [
      'fal-ai/flux/schnell',
      'fal-ai/flux-pro',
      'fal-ai/flux-pro/v1.1-ultra',
      'fal-ai/imagen4/preview',
      'fal-ai/kling-video/v1.6/standard/text-to-video',
      'fal-ai/kling-video/v1.6/pro/text-to-video',
      'fal-ai/luma-dream-machine',
      'fal-ai/veo3/fast',
    ];
    const params = modelIds.map(id => `endpoint_id=${encodeURIComponent(id)}`).join('&');
    const response = await fetch(`https://api.fal.ai/v1/models/pricing?${params}`, {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, error: errText });
    }

    const data = await response.json();
    const pricing = {};
    for (const p of (data.prices || [])) {
      pricing[p.endpoint_id] = {
        unit_price: p.unit_price,
        unit: p.unit,
        currency: p.currency || 'USD',
      };
    }
    return res.json({ success: true, pricing });
  } catch (err) {
    console.error('Model pricing fetch error:', err);
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
