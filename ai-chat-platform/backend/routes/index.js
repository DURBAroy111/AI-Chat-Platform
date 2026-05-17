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
// Tries multiple known endpoint shapes since fal.ai has changed their billing API.
router.get('/admin/credits', async (req, res) => {
  const FAL_KEY = process.env.FAL_KEY || '';

  if (!FAL_KEY) {
    return res.status(500).json({
      success: false,
      error: 'FAL_KEY is not set in Render environment variables',
    });
  }

  // fal.ai has multiple billing endpoint paths — try them in order
  const ENDPOINTS = [
    'https://fal.ai/api/billing/credits',          // dashboard internal (most current)
    'https://api.fal.ai/v1/account/balance',        // v1 balance
    'https://api.fal.ai/v1/account/billing/credits',// v1 credits
    'https://api.fal.ai/v1/account/billing?expand=credits', // old path
  ];

  const headers = {
    'Authorization': `Key ${FAL_KEY}`,
    'Content-Type': 'application/json',
  };

  let lastStatus = null;
  let lastBody = '';

  for (const url of ENDPOINTS) {
    try {
      const response = await fetch(url, { method: 'GET', headers });
      const rawText = await response.text();
      console.log(`[credits] tried ${url} → status ${response.status} body: ${rawText.slice(0, 200)}`);

      lastStatus = response.status;
      lastBody = rawText;

      if (!response.ok) continue; // try next endpoint

      let data;
      try { data = JSON.parse(rawText); }
      catch { continue; }

      // Normalise across all known response shapes
      const balance =
        data.credits?.current_balance ??
        data.credits?.balance ??
        data.current_balance ??
        data.balance ??
        data.amount ??
        null;

      const currency = data.credits?.currency ?? data.currency ?? 'USD';
      const username = data.username ?? data.user?.username ?? data.email ?? null;

      return res.json({ success: true, username, balance, currency });
    } catch (fetchErr) {
      console.warn(`[credits] fetch error for ${url}:`, fetchErr.message);
    }
  }

  // All endpoints failed — return the last status/body for debugging
  console.error('[credits] all endpoints failed. last status:', lastStatus, 'body:', lastBody.slice(0, 300));
  return res.status(502).json({
    success: false,
    error: `fal.ai credits API unreachable (last status: ${lastStatus ?? 'network error'})`,
    detail: lastBody.slice(0, 300),
  });
});

// Admin: live model pricing from fal.ai (with static fallback)
router.get('/admin/model-pricing', async (req, res) => {
  const FAL_KEY = process.env.FAL_KEY || '';

  // Static fallback pricing (always returned if API fails)
  const STATIC_PRICING = {
    'fal-ai/flux/schnell':                        { unit_price: 0.003,  unit: 'megapixel', currency: 'USD' },
    'fal-ai/flux-pro':                            { unit_price: 0.04,   unit: 'megapixel', currency: 'USD' },
    'fal-ai/flux-pro/v1.1-ultra':                 { unit_price: 0.06,   unit: 'image',     currency: 'USD' },
    'fal-ai/imagen4/preview':                     { unit_price: 0.02,   unit: 'image',     currency: 'USD' },
    'fal-ai/kling-video/v1.6/standard/text-to-video': { unit_price: 0.056, unit: 'second', currency: 'USD' },
    'fal-ai/kling-video/v1.6/pro/text-to-video':  { unit_price: 0.098,  unit: 'second',   currency: 'USD' },
    'fal-ai/luma-dream-machine':                  { unit_price: 0.50,   unit: 'video',     currency: 'USD' },
    'fal-ai/veo3/fast':                           { unit_price: 0.25,   unit: 'second',    currency: 'USD' },
  };

  if (!FAL_KEY) {
    return res.json({ success: true, pricing: STATIC_PRICING, source: 'static' });
  }

  const modelIds = Object.keys(STATIC_PRICING);

  try {
    const params = modelIds.map(id => `endpoint_id=${encodeURIComponent(id)}`).join('&');
    const response = await fetch(`https://api.fal.ai/v1/models/pricing?${params}`, {
      method: 'GET',
      headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    });

    const rawText = await response.text();
    console.log('[model-pricing] fal.ai status:', response.status, 'body:', rawText.slice(0, 300));

    if (!response.ok) {
      // Return static fallback instead of error
      return res.json({ success: true, pricing: STATIC_PRICING, source: 'static' });
    }

    let data;
    try { data = JSON.parse(rawText); }
    catch { return res.json({ success: true, pricing: STATIC_PRICING, source: 'static' }); }

    const priceList = data.prices || data.data || [];
    const pricing = { ...STATIC_PRICING }; // start with static, overlay live
    for (const p of priceList) {
      pricing[p.endpoint_id] = {
        unit_price: p.unit_price,
        unit: p.unit,
        currency: p.currency || 'USD',
      };
    }

    return res.json({ success: true, pricing, source: 'live' });
  } catch (err) {
    console.error('[model-pricing] fetch error:', err.message);
    return res.json({ success: true, pricing: STATIC_PRICING, source: 'static' });
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