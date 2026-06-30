// Reddit reviews proxy — proxies reddit.com/search.json, cached 1 hour at edge
export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ['https://prixly.xyz', 'https://www.prixly.xyz'];
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = req.query.q?.trim();
  if (!q || q.length < 2) return res.status(400).json({ error: 'Missing query' });
  if (q.length > 300) return res.status(400).json({ error: 'Query too long' });

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');

  try {
    const response = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(q + ' review')}&limit=6&sort=relevance&type=link`,
      { headers: { 'User-Agent': 'Prixly/1.0 price-comparison-app' } }
    );

    if (!response.ok) return res.status(502).json({ error: 'Reddit unavailable' });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Reviews proxy error:', err);
    return res.status(500).json({ error: 'Reviews failed' });
  }
}
