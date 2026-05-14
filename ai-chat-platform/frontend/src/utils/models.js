export const MODELS = {
  text: [
    {
      id: 'fal-ai/any-llm',
      name: 'Claude Haiku',
      provider: 'Anthropic',
      description: 'Fast replies, Q&A, summaries',
      speed: 'Fast',
      cost: 'Low',
      badge: 'Fast',
      badgeColor: 'green',
      // fal-ai/any-llm expects a "model" param
      falModel: 'anthropic/claude-haiku-4-5',
    },
    {
      id: 'fal-ai/any-llm',
      name: 'Claude Sonnet',
      provider: 'Anthropic',
      description: 'Long-form writing & analysis',
      speed: 'Medium',
      cost: 'Medium',
      badge: 'Smart',
      badgeColor: 'blue',
      falModel: 'anthropic/claude-sonnet-4-5',
      uniqueId: 'fal-ai/any-llm::sonnet',
    },
    {
      id: 'fal-ai/any-llm',
      name: 'Gemini Flash',
      provider: 'Google',
      description: 'Multimodal, fast reasoning',
      speed: 'Fast',
      cost: 'Low',
      badge: 'Fast',
      badgeColor: 'green',
      falModel: 'google/gemini-flash-1.5',
      uniqueId: 'fal-ai/any-llm::gemini',
    },
  ],
  image: [
    {
      id: 'fal-ai/flux/schnell',
      name: 'FLUX Schnell',
      provider: 'Black Forest Labs',
      description: 'Fast generation, great for previews',
      speed: 'Fast',
      cost: '$0.003/img',
      badge: 'Fast',
      badgeColor: 'green',
    },
    {
      id: 'fal-ai/flux-pro',
      name: 'FLUX Pro',
      provider: 'Black Forest Labs',
      description: 'High quality, photorealistic',
      speed: 'Medium',
      cost: '$0.04/img',
      badge: 'Quality',
      badgeColor: 'purple',
    },
    {
      id: 'fal-ai/flux-pro/v1.1-ultra',
      name: 'FLUX Max',
      provider: 'Black Forest Labs',
      description: 'Highest FLUX quality',
      speed: 'Slow',
      cost: '$0.07/img',
      badge: 'Best',
      badgeColor: 'yellow',
    },
    {
      id: 'fal-ai/imagen4/preview',
      name: 'Imagen 4',
      provider: 'Google',
      description: "Google's quality model",
      speed: 'Fast',
      cost: '$0.02/img',
      badge: 'New',
      badgeColor: 'blue',
    },
  ],
  video: [
    {
      id: 'fal-ai/kling-video/v1.6/standard',
      name: 'Kling Standard',
      provider: 'Kling AI',
      description: 'Good budget 720p video',
      speed: 'Medium',
      cost: '$0.22/10s',
      badge: 'Budget',
      badgeColor: 'green',
    },
    {
      id: 'fal-ai/kling-video/v1.6/pro',
      name: 'Kling Pro',
      provider: 'Kling AI',
      description: 'Premium smooth motion',
      speed: 'Slow',
      cost: '$0.52/10s',
      badge: 'Pro',
      badgeColor: 'purple',
    },
    {
      id: 'fal-ai/luma-dream-machine',
      name: 'Luma Dream',
      provider: 'Luma AI',
      description: 'Cinematic, great for creative',
      speed: 'Slow',
      cost: '$0.50/10s',
      badge: 'Cinematic',
      badgeColor: 'pink',
    },
    {
      id: 'fal-ai/veo3/fast',
      name: 'Veo 3 Fast',
      provider: 'Google',
      description: "Google's video model",
      speed: 'Medium',
      cost: '$0.64/10s',
      badge: 'New',
      badgeColor: 'blue',
    },
  ],
};

// Model display name lookup (for rendering from stored model_id strings)
export const MODEL_DISPLAY_NAMES = {
  'fal-ai/any-llm': 'Claude Haiku',
  'fal-ai/any-llm::sonnet': 'Claude Sonnet',
  'fal-ai/any-llm::gemini': 'Gemini Flash',
  'anthropic/claude-haiku-4-5': 'Claude Haiku',
  'anthropic/claude-sonnet-4-5': 'Claude Sonnet',
  'google/gemini-flash-1.5': 'Gemini Flash',
  'fal-ai/claude-haiku': 'Claude Haiku',    // legacy compat
  'fal-ai/claude-sonnet': 'Claude Sonnet',  // legacy compat
  'fal-ai/gemini-flash': 'Gemini Flash',    // legacy compat
  'fal-ai/flux/schnell': 'FLUX Schnell',
  'fal-ai/flux-pro': 'FLUX Pro',
  'fal-ai/flux-pro/v1.1-ultra': 'FLUX Max',
  'fal-ai/imagen4/preview': 'Imagen 4',
  'fal-ai/kling-video/v1.6/standard': 'Kling Standard',
  'fal-ai/kling-video/v1.6/pro': 'Kling Pro',
  'fal-ai/luma-dream-machine': 'Luma Dream',
  'fal-ai/veo3/fast': 'Veo 3 Fast',
};

// Map a stored model_id to a human-friendly name
export function getModelName(modelId) {
  if (!modelId) return '';
  return MODEL_DISPLAY_NAMES[modelId] || modelId.split('/').pop();
}

// Text model config: maps model_id → { falEndpoint, falModel }
// The "uniqueId" is used in the selector to distinguish multiple entries
// that share the same fal endpoint.
export const TEXT_MODEL_CONFIG = {
  'fal-ai/any-llm': {
    falEndpoint: 'fal-ai/any-llm',
    falModel: 'anthropic/claude-haiku-4-5',
  },
  'fal-ai/any-llm::sonnet': {
    falEndpoint: 'fal-ai/any-llm',
    falModel: 'anthropic/claude-sonnet-4-5',
  },
  'fal-ai/any-llm::gemini': {
    falEndpoint: 'fal-ai/any-llm',
    falModel: 'google/gemini-flash-1.5',
  },
  // Legacy IDs that might be stored in DB already
  'fal-ai/claude-haiku': {
    falEndpoint: 'fal-ai/any-llm',
    falModel: 'anthropic/claude-haiku-4-5',
  },
  'fal-ai/claude-sonnet': {
    falEndpoint: 'fal-ai/any-llm',
    falModel: 'anthropic/claude-sonnet-4-5',
  },
  'fal-ai/gemini-flash': {
    falEndpoint: 'fal-ai/any-llm',
    falModel: 'google/gemini-flash-1.5',
  },
};

export const TASK_TYPES = [
  {
    id: 'text',
    name: 'Text',
    icon: '💬',
    description: 'Chat, write, summarize, analyze',
    examples: ['Explain quantum computing', 'Write a blog post about AI', 'Summarize this article'],
    color: 'from-blue-600 to-indigo-600',
    accent: 'blue',
  },
  {
    id: 'image',
    name: 'Image',
    icon: '🎨',
    description: 'Generate stunning images from text',
    examples: ['A cyberpunk city at sunset', 'Portrait of a robot in watercolor', 'Mountain landscape, golden hour'],
    color: 'from-purple-600 to-pink-600',
    accent: 'purple',
  },
  {
    id: 'video',
    name: 'Video',
    icon: '🎬',
    description: 'Create videos from text prompts',
    examples: ['Ocean waves at sunset, 4K cinematic', 'Flying through clouds, aerial view', 'City traffic timelapse, night'],
    color: 'from-orange-600 to-red-600',
    accent: 'orange',
  },
];
