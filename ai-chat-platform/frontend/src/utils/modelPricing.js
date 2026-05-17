// Cache for fal.ai real pricing data
let pricingCache = null;
let fetchPromise = null;

export async function getModelPricing() {
  if (pricingCache) return pricingCache;
  if (fetchPromise) return fetchPromise;

  const base = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';
  fetchPromise = fetch(`${base}/api/admin/model-pricing`)
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        pricingCache = data.pricing;
        return data.pricing;
      }
      return {};
    })
    .catch(() => ({}))
    .finally(() => { fetchPromise = null; });

  return fetchPromise;
}

// Normalize model ID to endpoint ID used in pricing API
// (video models have /text-to-video suffix in the API)
export function toEndpointId(modelId) {
  const VIDEO_MAP = {
    'fal-ai/kling-video/v1.6/standard': 'fal-ai/kling-video/v1.6/standard/text-to-video',
    'fal-ai/kling-video/v1.6/pro': 'fal-ai/kling-video/v1.6/pro/text-to-video',
  };
  return VIDEO_MAP[modelId] || modelId;
}

export function formatCost(unitPrice, unit) {
  if (unitPrice == null) return null;
  const price = Number(unitPrice);
  if (unit === 'image') return `$${price.toFixed(3)}/img`;
  if (unit === 'second') return `$${price.toFixed(3)}/s`;
  if (unit === 'video') return `$${price.toFixed(3)}/vid`;
  return `$${price.toFixed(4)}`;
}
