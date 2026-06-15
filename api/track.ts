type TrackRequest = {
  method?: string;
  body?: {
    productId?: string;
    retailer?: string;
    affiliateUrl?: string;
  };
};

type TrackResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): {
    json(payload: unknown): void;
  };
};

export default function handler(req: TrackRequest, res: TrackResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { productId, retailer, affiliateUrl } = req.body || {};

  console.log(`[AFFILIATE TRACK] Redirect logged at ${new Date().toISOString()}:`);
  console.log(`  - Product ID: ${productId || 'unknown'}`);
  console.log(`  - Destination Retailer: ${retailer || 'unknown'}`);
  console.log(`  - URL: ${affiliateUrl || 'unknown'}`);

  return res.status(200).json({
    success: true,
    message: 'Click tracking event logged successfully',
    redirectTarget: affiliateUrl,
    timestamp: new Date().toISOString(),
  });
}
