export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, productName, currentPrice, targetPrice, retailer } = req.body;

  if (!to || !productName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Prixly Alerts <alerts@prixly.xyz>',
        to: [to],
        subject: `Price drop: ${productName} is now ${currentPrice}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem;background:#0f0f0f;color:#fff;border-radius:12px;">
            <div style="color:#2ecc71;font-size:1.4rem;font-weight:800;margin-bottom:.5rem;">Prixly</div>
            <h2 style="margin:0 0 1rem;">Price drop alert</h2>
            <p style="color:#aaa;">An item on your watchlist just dropped below your target price.</p>
            <div style="background:#1a1a1a;border-radius:8px;padding:1.25rem;margin:1.5rem 0;">
              <div style="font-weight:700;font-size:1.05rem;margin-bottom:.5rem;">${productName}</div>
              <div style="color:#aaa;font-size:.85rem;margin-bottom:.75rem;">via ${retailer}</div>
              <div style="display:flex;gap:1rem;align-items:baseline;">
                <span style="color:#2ecc71;font-size:1.5rem;font-weight:800;">${currentPrice}</span>
                <span style="color:#666;font-size:.85rem;">Your target: ${targetPrice}</span>
              </div>
            </div>
            <a href="https://prixly.xyz" style="display:inline-block;background:#2ecc71;color:#000;padding:.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:700;">View deal on Prixly →</a>
            <p style="color:#555;font-size:.75rem;margin-top:2rem;">You're receiving this because you set a price alert on Prixly. <a href="https://prixly.xyz" style="color:#555;">Unsubscribe</a></p>
          </div>
        `
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Resend error');
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
