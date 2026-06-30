// Brave Search proxy — key stays server-side, results cached at edge for 24h
const rateLimitStore = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

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
  const origin = req.headers.origin || '';
  const allowed = ['https://prixly.xyz', 'https://www.prixly.xyz'];
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests' });

  const q = req.query.q?.trim();
  if (!q || q.length < 2) return res.status(400).json({ error: 'Missing query' });
  if (q.length > 300) return res.status(400).json({ error: 'Query too long' });

  // Cache at Vercel edge for 24 hours — same query hits Brave once per day
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q + ' buy price')}&count=20&search_lang=en&safesearch=moderate`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': process.env.BRAVE_API_KEY
        }
      }
    );

    if (!response.ok) {
      console.error('Brave API error:', response.status);
      return res.status(502).json({ error: 'Search provider error' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Search proxy error:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
}
