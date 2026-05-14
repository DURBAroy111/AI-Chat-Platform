const { fal } = require('@fal-ai/client');
require('dotenv').config();

// Configure fal client
fal.config({ credentials: process.env.FAL_KEY });

// Map stored model_id → actual fal endpoint + inner model param
// Model strings must match exactly what fal-ai/any-llm accepts
function resolveTextModel(modelId) {
  const MAP = {
    // Current IDs used by the frontend
    'fal-ai/any-llm':         { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-3-haiku' },
    'fal-ai/any-llm::sonnet': { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-3.5-sonnet' },
    'fal-ai/any-llm::gemini': { endpoint: 'fal-ai/any-llm', model: 'google/gemini-flash-1.5' },
    // Legacy IDs still in DB from before the fix
    'fal-ai/claude-haiku':  { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-3-haiku' },
    'fal-ai/claude-sonnet': { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-3.5-sonnet' },
    'fal-ai/gemini-flash':  { endpoint: 'fal-ai/any-llm', model: 'google/gemini-flash-1.5' },
  };
  const resolved = MAP[modelId] || { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-3-haiku' };
  console.log(`[resolveTextModel] "${modelId}" → model: "${resolved.model}"`);
  return resolved;
}

// === TEXT GENERATION ===
// fal-ai/any-llm uses "prompt" not "messages"
// History is formatted into the prompt string manually
async function generateText(modelId, prompt, history = []) {
  const { endpoint, model } = resolveTextModel(modelId);

  // Build a single prompt string that includes conversation history
  let fullPrompt = prompt;
  if (history && history.length > 0) {
    const historyText = history
      .filter(m => m.content && m.content.trim())
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.trim()}`)
      .join('\n');
    if (historyText) {
      fullPrompt = `${historyText}\nUser: ${prompt}`;
    }
  }

  console.log(`[generateText] calling ${endpoint}, model=${model}, promptLength=${fullPrompt.length}`);

  try {
    const result = await fal.subscribe(endpoint, {
      input: {
        model,
        prompt: fullPrompt,
        system: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.',
      },
    });

    // Log raw output shape once for debugging
    const output = result.data || result;
    console.log(`[generateText] response keys: ${Object.keys(output).join(', ')}`);

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
  } catch (err) {
    console.error(`[generateText] ERROR body:`, JSON.stringify(err?.body || err?.message || err, null, 2));
    throw err;
  }
}

// === IMAGE GENERATION ===
// Returns fal.ai CDN URL directly — no local download, works on Render/Vercel
async function generateImage(modelId, prompt) {
  console.log(`[generateImage] calling ${modelId}`);
  try {
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

    console.log(`[generateImage] success: ${imageUrl}`);
    return imageUrl;
  } catch (err) {
    console.error(`[generateImage] ERROR:`, JSON.stringify(err?.body || err?.message || err, null, 2));
    throw err;
  }
}

// === VIDEO GENERATION (async with polling) ===
async function submitVideoJob(modelId, prompt) {
  console.log(`[submitVideoJob] calling ${modelId}`);
  try {
    const { request_id } = await fal.queue.submit(modelId, {
      input: {
        prompt,
        duration: '5',
        aspect_ratio: '16:9',
      },
    });
    console.log(`[submitVideoJob] request_id: ${request_id}`);
    return request_id;
  } catch (err) {
    console.error(`[submitVideoJob] ERROR:`, JSON.stringify(err?.body || err?.message || err, null, 2));
    throw err;
  }
}

async function checkVideoStatus(modelId, requestId) {
  try {
    const status = await fal.queue.status(modelId, {
      requestId,
      logs: true,
    });

    console.log(`[checkVideoStatus] ${requestId} → ${status.status}`);

    if (status.status === 'COMPLETED') {
      const result = await fal.queue.result(modelId, { requestId });
      const output = result.data || result;
      // Return fal.ai CDN URL directly — no local download
      const videoUrl = output.video?.url || output.videos?.[0]?.url;
      if (!videoUrl) throw new Error('No video URL in completed result');
      console.log(`[checkVideoStatus] complete: ${videoUrl}`);
      return { status: 'complete', media_url: videoUrl };
    }

    if (status.status === 'FAILED') {
      return { status: 'error', error: 'Video generation failed' };
    }

    return { status: 'processing', logs: status.logs };
  } catch (err) {
    console.error(`[checkVideoStatus] ERROR:`, JSON.stringify(err?.body || err?.message || err, null, 2));
    return { status: 'error', error: err.message };
  }
}

// Kept for /admin/disk-usage route compatibility
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
