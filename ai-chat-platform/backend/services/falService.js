const { fal } = require('@fal-ai/client');
require('dotenv').config();

fal.config({ credentials: process.env.FAL_KEY });

// ─── COST EXTRACTION ─────────────────────────────────────────────────────────
// fal.ai embeds billing info under several possible keys depending on client version.
function extractCost(result, output) {
  const rm = result?.requestMetrics;
  if (rm) {
    const v = rm.billingCost ?? rm.billing_cost ?? rm.cost ?? rm.cost_usd;
    if (v != null) return Number(v);
  }
  const rm2 = result?.data?.requestMetrics;
  if (rm2) {
    const v = rm2.billingCost ?? rm2.billing_cost ?? rm2.cost ?? rm2.cost_usd;
    if (v != null) return Number(v);
  }
  if (output) {
    const v = output.billing_cost ?? output.billingCost ?? output.cost ?? output.cost_usd;
    if (v != null) return Number(v);
  }
  return null;
}

// ─── TEXT ────────────────────────────────────────────────────────────────────
function resolveTextModel(modelId) {
  const MAP = {
    'fal-ai/any-llm':         { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-3-haiku' },
    'fal-ai/any-llm::sonnet': { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-3.5-sonnet' },
    'fal-ai/any-llm::gemini': { endpoint: 'fal-ai/any-llm', model: 'google/gemini-flash-1.5' },
    'fal-ai/claude-haiku':  { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-3-haiku' },
    'fal-ai/claude-sonnet': { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-3.5-sonnet' },
    'fal-ai/gemini-flash':  { endpoint: 'fal-ai/any-llm', model: 'google/gemini-flash-1.5' },
  };
  const resolved = MAP[modelId] || { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-3-haiku' };
  console.log(`[resolveTextModel] "${modelId}" → model: "${resolved.model}"`);
  return resolved;
}

// ─── VIDEO ───────────────────────────────────────────────────────────────────
function resolveVideoEndpoint(modelId) {
  const MAP = {
    'fal-ai/kling-video/v1.6/standard': 'fal-ai/kling-video/v1.6/standard/text-to-video',
    'fal-ai/kling-video/v1.6/pro':      'fal-ai/kling-video/v1.6/pro/text-to-video',
    'fal-ai/luma-dream-machine': 'fal-ai/luma-dream-machine',
    'fal-ai/veo3/fast':          'fal-ai/veo3/fast',
  };
  const resolved = MAP[modelId] || modelId;
  console.log(`[resolveVideoEndpoint] "${modelId}" → "${resolved}"`);
  return resolved;
}

// ─── TEXT GENERATION ─────────────────────────────────────────────────────────
async function generateText(modelId, prompt, history = []) {
  const { endpoint, model } = resolveTextModel(modelId);

  let fullPrompt = prompt;
  if (history && history.length > 0) {
    const historyText = history
      .filter(m => m.content && m.content.trim())
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.trim()}`)
      .join('\n');
    if (historyText) fullPrompt = `${historyText}\nUser: ${prompt}`;
  }

  console.log(`[generateText] calling ${endpoint}, model=${model}, promptLength=${fullPrompt.length}`);

  try {
    const result = await fal.subscribe(endpoint, {
      input: { model, prompt: fullPrompt, system: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.' },
    });

    const output = result.data || result;
    console.log(`[generateText] response keys: ${Object.keys(output).join(', ')}`);
    const costUsd = extractCost(result, output);
    console.log(`[generateText] cost=$${costUsd ?? 'unknown'}`);

    let text;
    if (output.output) text = output.output;
    else if (output.text) text = output.text;
    else if (output.message) text = output.message;
    else if (output.choices?.[0]?.message?.content) text = output.choices[0].message.content;
    else if (output.content) {
      text = typeof output.content === 'string' ? output.content
        : Array.isArray(output.content) ? output.content.map(c => c.text || '').join('')
        : JSON.stringify(output);
    } else {
      text = JSON.stringify(output);
    }

    return { text, costUsd };
  } catch (err) {
    console.error(`[generateText] ERROR:`, JSON.stringify(err?.body || err?.message || err, null, 2));
    throw err;
  }
}

// ─── IMAGE GENERATION ────────────────────────────────────────────────────────
async function generateImage(modelId, prompt) {
  console.log(`[generateImage] calling ${modelId}`);
  try {
    const result = await fal.subscribe(modelId, {
      input: { prompt, image_size: 'landscape_4_3', num_images: 1, enable_safety_checker: true },
      logs: true,
    });

    const output = result.data || result;
    const imageUrl = output.images?.[0]?.url || output.image?.url;
    if (!imageUrl) throw new Error('No image URL returned from fal.ai');

    const costUsd = extractCost(result, output);
    console.log(`[generateImage] success: ${imageUrl} cost=$${costUsd ?? 'unknown'}`);
    return { url: imageUrl, costUsd };
  } catch (err) {
    console.error(`[generateImage] ERROR:`, JSON.stringify(err?.body || err?.message || err, null, 2));
    throw err;
  }
}

// ─── VIDEO GENERATION ────────────────────────────────────────────────────────
async function submitVideoJob(modelId, prompt) {
  const endpoint = resolveVideoEndpoint(modelId);
  console.log(`[submitVideoJob] calling ${endpoint}`);
  try {
    const { request_id } = await fal.queue.submit(endpoint, {
      input: { prompt, duration: '5', aspect_ratio: '16:9' },
    });
    console.log(`[submitVideoJob] request_id: ${request_id}`);
    return request_id;
  } catch (err) {
    console.error(`[submitVideoJob] ERROR:`, JSON.stringify(err?.body || err?.message || err, null, 2));
    throw err;
  }
}

async function checkVideoStatus(modelId, requestId) {
  const endpoint = resolveVideoEndpoint(modelId);
  console.log(`[checkVideoStatus] polling ${endpoint} for ${requestId}`);
  try {
    const status = await fal.queue.status(endpoint, { requestId, logs: true });
    console.log(`[checkVideoStatus] ${requestId} → ${status.status}`);

    if (status.status === 'COMPLETED') {
      const result = await fal.queue.result(endpoint, { requestId });
      const output = result.data || result;
      const videoUrl = output.video?.url || output.videos?.[0]?.url;
      if (!videoUrl) throw new Error('No video URL in completed result');
      const costUsd = extractCost(result, output);
      console.log(`[checkVideoStatus] complete: ${videoUrl} cost=$${costUsd ?? 'unknown'}`);
      return { status: 'complete', media_url: videoUrl, costUsd };
    }

    if (status.status === 'FAILED') return { status: 'error', error: 'Video generation failed' };
    return { status: 'processing', logs: status.logs };
  } catch (err) {
    console.error(`[checkVideoStatus] ERROR:`, JSON.stringify(err?.body || err?.message || err, null, 2));
    return { status: 'error', error: err.message };
  }
}

function getUploadsDiskUsage() {
  return { totalSize: 0, totalSizeMB: '0.00', fileCount: 0 };
}

module.exports = { generateText, generateImage, submitVideoJob, checkVideoStatus, getUploadsDiskUsage };
