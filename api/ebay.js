// eBay Browse API proxy — real prices, images, titles sorted cheapest first
// Token cached in memory (valid 2h), results cached at edge for 1h

let cachedToken = null;
let tokenExpiry = 0;

async function getEbayToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const creds = Buffer.from(`${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`).toString('base64');
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope'
  });
  if (!res.ok) throw new Error(`eBay auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

const MARKETPLACE_MAP = {
  GB: 'EBAY_GB', US: 'EBAY_US', AU: 'EBAY_AU', CA: 'EBAY_CA',
  DE: 'EBAY_DE', FR: 'EBAY_FR', IT: 'EBAY_IT', ES: 'EBAY_ES',
};

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ['https://prixly.xyz', 'https://www.prixly.xyz'];
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = req.query.q?.trim();
  const region = req.query.region?.toUpperCase() || 'GB';
  if (!q || q.length < 2) return res.status(400).json({ error: 'Missing query' });
  if (q.length > 200) return res.status(400).json({ error: 'Query too long' });

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');

  try {
    const token = await getEbayToken();
    const marketplace = MARKETPLACE_MAP[region] || 'EBAY_GB';
    const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(q)}&limit=20&sort=price&filter=buyingOptions%3A%7BFIXED_PRICE%7D`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': marketplace,
        'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country%3D' + region,
      }
    });

    if (!response.ok) {
      console.error('eBay API error:', response.status, await response.text());
      return res.status(502).json({ error: 'eBay unavailable' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('eBay proxy error:', err);
    return res.status(500).json({ error: 'eBay search failed' });
  }
}
