// In-memory rate limit store (resets on cold start, sufficient for abuse prevention)
const rateLimitStore = new Map();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;      // 10 requests per minute per IP

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip) || { count: 0, windowStart: now };

  if (now - entry.windowStart > WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
    rateLimitStore.set(ip, entry);
    return false;
  }

  entry.count++;
  rateLimitStore.set(ip, entry);
  return entry.count > MAX_REQUESTS;
}

export default async function handler(req, res) {
  // CORS — only allow requests from prixly.xyz
  const origin = req.headers.origin || '';
  const allowed = ['https://prixly.xyz', 'https://www.prixly.xyz'];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limiting by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
  }

  // Validate request body exists
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Only allow specific models to prevent abuse
  const allowedModels = ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];
  if (req.body.model && !allowedModels.includes(req.body.model)) {
    return res.status(400).json({ error: 'Model not permitted' });
  }

  // Cap max_tokens to prevent runaway costs
  if (req.body.max_tokens && req.body.max_tokens > 1500) {
    return res.status(400).json({ error: 'max_tokens exceeds limit' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Claude proxy error:', error);
    return res.status(500).json({ error: 'Failed to reach Claude API' });
  }
}
