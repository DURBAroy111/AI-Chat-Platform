const { fal } = require('@fal-ai/client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Configure fal client
fal.config({ credentials: process.env.FAL_KEY });

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const imagesDir = path.join(__dirname, '..', UPLOAD_DIR, 'images');
  const videosDir = path.join(__dirname, '..', UPLOAD_DIR, 'videos');
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
};

ensureUploadDirs();

// Download file from URL and save locally
async function downloadAndSave(url, subDir, extension) {
  const filename = `${uuidv4()}.${extension}`;
  const saveDir = path.join(__dirname, '..', UPLOAD_DIR, subDir);
  const filepath = path.join(saveDir, filename);
  const relativePath = `/${UPLOAD_DIR}/${subDir}/${filename}`;

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,
    headers: { 'User-Agent': 'AI-Chat-Platform/1.0' }
  });

  fs.writeFileSync(filepath, response.data);
  return relativePath;
}

// Map stored model_id → actual fal endpoint + inner model param
// This handles legacy IDs and new IDs.
function resolveTextModel(modelId) {
  const MAP = {
    // New IDs
    'fal-ai/any-llm':          { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-haiku-4-5' },
    'fal-ai/any-llm::sonnet':  { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-sonnet-4-5' },
    'fal-ai/any-llm::gemini':  { endpoint: 'fal-ai/any-llm', model: 'google/gemini-flash-1.5' },
    // Legacy IDs stored in DB before the fix
    'fal-ai/claude-haiku':  { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-haiku-4-5' },
    'fal-ai/claude-sonnet': { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-sonnet-4-5' },
    'fal-ai/gemini-flash':  { endpoint: 'fal-ai/any-llm', model: 'google/gemini-flash-1.5' },
  };
  return MAP[modelId] || { endpoint: 'fal-ai/any-llm', model: 'anthropic/claude-haiku-4-5' };
}

// === TEXT GENERATION ===
async function generateText(modelId, prompt, history = []) {
  const { endpoint, model } = resolveTextModel(modelId);

  // Build messages array from history
  const messages = history.map(msg => ({
    role: msg.role,
    content: msg.content || '',
  })).filter(m => m.content); // skip empty
  messages.push({ role: 'user', content: prompt });

  const result = await fal.subscribe(endpoint, {
    input: {
      model,
      messages,
      system: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.',
    },
  });

  // Handle different response formats from fal.ai
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

  const relativePath = await downloadAndSave(imageUrl, 'images', 'jpg');
  return relativePath;
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
      const videoUrl = output.video?.url || output.videos?.[0]?.url;
      if (!videoUrl) throw new Error('No video URL in completed result');

      const relativePath = await downloadAndSave(videoUrl, 'videos', 'mp4');
      return { status: 'complete', media_url: relativePath };
    }

    if (status.status === 'FAILED') {
      return { status: 'error', error: 'Video generation failed' };
    }

    return { status: 'processing', logs: status.logs };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

// Delete a local file
function deleteLocalFile(relativePath) {
  if (!relativePath) return;
  try {
    const fullPath = path.join(__dirname, '..', relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error('File delete error:', err.message);
  }
}

// Get disk usage of uploads folder
function getUploadsDiskUsage() {
  const dir = path.join(__dirname, '..', UPLOAD_DIR);
  let totalSize = 0;
  let fileCount = 0;

  const walkDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const filepath = path.join(dirPath, file);
      const stat = fs.statSync(filepath);
      if (stat.isDirectory()) {
        walkDir(filepath);
      } else {
        totalSize += stat.size;
        fileCount++;
      }
    });
  };

  walkDir(dir);
  return {
    totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    fileCount,
  };
}

module.exports = {
  generateText,
  generateImage,
  submitVideoJob,
  checkVideoStatus,
  deleteLocalFile,
  getUploadsDiskUsage,
};
