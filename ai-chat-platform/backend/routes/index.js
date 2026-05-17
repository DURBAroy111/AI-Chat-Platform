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

// Admin: live credit balance from fal.ai
// GET https://api.fal.ai/v1/account/billing?expand=credits
router.get('/admin/credits', async (req, res) => {
  const FAL_KEY = process.env.FAL_KEY || '';

  if (!FAL_KEY) {
    return res.status(500).json({
      success: false,
      error: 'FAL_KEY is not set in Render environment variables',
    });
  }

  try {
    const response = await fetch('https://api.fal.ai/v1/account/billing?expand=credits', {
      method: 'GET',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const rawText = await response.text();
    console.log('[credits] fal.ai status:', response.status, 'body:', rawText.slice(0, 300));

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `fal.ai returned ${response.status}`,
        detail: rawText,
      });
    }

    let data;
    try { data = JSON.parse(rawText); }
    catch { return res.status(500).json({ success: false, error: 'Invalid JSON from fal.ai', detail: rawText }); }

    // Handle multiple possible response shapes from fal.ai
    const balance =
      data.credits?.current_balance ??
      data.credits?.balance ??
      data.current_balance ??
      data.balance ??
      null;

    const currency = data.credits?.currency ?? data.currency ?? 'USD';

    return res.json({
      success: true,
      username: data.username ?? null,
      balance,
      currency,
    });
  } catch (err) {
    console.error('[credits] fetch error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: live model pricing from fal.ai
// GET https://api.fal.ai/v1/models/pricing?endpoint_id=...
router.get('/admin/model-pricing', async (req, res) => {
  const FAL_KEY = process.env.FAL_KEY || '';

  if (!FAL_KEY) {
    return res.status(500).json({ success: false, error: 'FAL_KEY not set on Render' });
  }

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

  try {
    const params = modelIds.map(id => `endpoint_id=${encodeURIComponent(id)}`).join('&');
    const response = await fetch(`https://api.fal.ai/v1/models/pricing?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const rawText = await response.text();
    console.log('[model-pricing] fal.ai status:', response.status, 'body:', rawText.slice(0, 300));

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: rawText });
    }

    let data;
    try { data = JSON.parse(rawText); }
    catch { return res.status(500).json({ success: false, error: 'Invalid JSON from fal.ai' }); }

    const priceList = data.prices || data.data || [];
    const pricing = {};
    for (const p of priceList) {
      pricing[p.endpoint_id] = {
        unit_price: p.unit_price,
        unit: p.unit,
        currency: p.currency || 'USD',
      };
    }

    return res.json({ success: true, pricing });
  } catch (err) {
    console.error('[model-pricing] fetch error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Models config
router.get('/models', (req, res) => {
  res.json({ success: true, models: {
    text: [
      { id: 'fal-ai/any-llm',         name: 'Claude Haiku',  description: 'Fast & efficient for Q&A, summaries', speed: 'Fast',   cost: 'Low'    },
      { id: 'fal-ai/any-llm::sonnet', name: 'Claude Sonnet', description: 'Best for long writing & analysis',    speed: 'Medium', cost: 'Medium' },
      { id: 'fal-ai/any-llm::gemini', name: 'Gemini Flash',  description: 'Multimodal, fast reasoning',          speed: 'Fast',   cost: 'Low'    },
    ],
    image: [
      { id: 'fal-ai/flux/schnell',        name: 'FLUX Schnell', description: 'Fast generation, great for previews', speed: 'Fast',   cost: '$0.003/MP' },
      { id: 'fal-ai/flux-pro',            name: 'FLUX Pro',     description: 'High quality, photorealistic',        speed: 'Medium', cost: '$0.04/MP'  },
      { id: 'fal-ai/flux-pro/v1.1-ultra', name: 'FLUX Max',     description: 'Highest FLUX quality',                speed: 'Slow',   cost: '$0.06/img' },
      { id: 'fal-ai/imagen4/preview',     name: 'Imagen 4',     description: "Google's quality model",              speed: 'Fast',   cost: '$0.02/img' },
    ],
    video: [
      { id: 'fal-ai/kling-video/v1.6/standard', name: 'Kling Standard', description: 'Good budget 720p video', speed: 'Medium', cost: '$0.056/s'  },
      { id: 'fal-ai/kling-video/v1.6/pro',      name: 'Kling Pro',      description: 'Premium smooth motion',  speed: 'Slow',   cost: '$0.098/s'  },
      { id: 'fal-ai/luma-dream-machine',         name: 'Luma Dream',     description: 'Cinematic video',        speed: 'Slow',   cost: '$0.50/vid' },
      { id: 'fal-ai/veo3/fast',                  name: 'Veo 3 Fast',     description: "Google's video model",   speed: 'Medium', cost: '$0.25/s'   },
    ],
  }});
});

module.exports = router;