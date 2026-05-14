const { fal } = require('@fal-ai/client');
require('dotenv').config();

// Configure fal client
fal.config({ credentials: process.env.FAL_KEY });

// Map stored model_id → actual fal endpoint + inner model param
function resolveTextModel(modelId) {
  const MAP = {
    // Current IDs
    'fal-ai/any-llm':         { endpoint: 'fal-ai/any-llm', model: 'claude-haiku-4-5' },
    'fal-ai/any-llm::sonnet': { endpoint: 'fal-ai/any-llm', model: 'claude-sonnet-4-5' },
    'fal-ai/any-llm::gemini': { endpoint: 'fal-ai/any-llm', model: 'google/gemini-flash-2.0' },
    // Legacy IDs stored in DB before the fix
    'fal-ai/claude-haiku':  { endpoint: 'fal-ai/any-llm', model: 'claude-haiku-4-5' },
    'fal-ai/claude-sonnet': { endpoint: 'fal-ai/any-llm', model: 'claude-sonnet-4-5' },
    'fal-ai/gemini-flash':  { endpoint: 'fal-ai/any-llm', model: 'google/gemini-flash-2.0' },
  };
  // Default to haiku if unknown
  return MAP[modelId] || { endpoint: 'fal-ai/any-llm', model: 'claude-haiku-4-5' };
}

// === TEXT GENERATION ===
async function generateText(modelId, prompt, history = []) {
  const { endpoint, model } = resolveTextModel(modelId);

  const messages = history
    .map(msg => ({ role: msg.role, content: msg.content || '' }))
    .filter(m => m.content);
  messages.push({ role: 'user', content: prompt });

  const result = await fal.subscribe(endpoint, {
    input: {
      model,
      messages,
      system: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.',
    },
  });

  const output = result.data || result;
  if (output.output) return output.output;
  if (output.text) return output.text;
  if (output.message) return output.message;
  if (output.choices?.[0]?.message?.content) return output.choices[0].message.content;
  if (output.content) {
    if (typeof output.content === 'string') return output.content;
    if (Array.isArray(output.content)) {
      return output.content.map(c => c.text || '').join('');
    }
  }
  return JSON.stringify(output);
}

// === IMAGE GENERATION ===
// Returns the fal.ai CDN URL directly — no local download needed
async function generateImage(modelId, prompt) {
  const result = await fal.subscribe(modelId, {
    input: {
      prompt,
      image_size: 'landscape_4_3',
      num_images: 1,
      enable_safety_checker: true,
    },
    logs: true,
  });

  const output = result.data || result;
  const imageUrl = output.images?.[0]?.url || output.image?.url;
  if (!imageUrl) throw new Error('No image URL returned from fal.ai');

  // Return the CDN URL directly — works on any hosting (Vercel, Render, Railway)
  return imageUrl;
}

// === VIDEO GENERATION (async with polling) ===
async function submitVideoJob(modelId, prompt) {
  const { request_id } = await fal.queue.submit(modelId, {
    input: {
      prompt,
      duration: '5',
      aspect_ratio: '16:9',
    },
  });
  return request_id;
}

async function checkVideoStatus(modelId, requestId) {
  try {
    const status = await fal.queue.status(modelId, {
      requestId,
      logs: true,
    });

    if (status.status === 'COMPLETED') {
      const result = await fal.queue.result(modelId, { requestId });
      const output = result.data || result;
      // Return fal.ai CDN URL directly — no local download
      const videoUrl = output.video?.url || output.videos?.[0]?.url;
      if (!videoUrl) throw new Error('No video URL in completed result');
      return { status: 'complete', media_url: videoUrl };
    }

    if (status.status === 'FAILED') {
      return { status: 'error', error: 'Video generation failed' };
    }

    return { status: 'processing', logs: status.logs };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

// Get upload dir disk usage (kept for /admin/disk-usage route compatibility)
function getUploadsDiskUsage() {
  return { totalSize: 0, totalSizeMB: '0.00', fileCount: 0 };
}

module.exports = {
  generateText,
  generateImage,
  submitVideoJob,
  checkVideoStatus,
  getUploadsDiskUsage,
};
