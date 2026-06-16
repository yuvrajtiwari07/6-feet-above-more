export type HeightBand = '6_0_6_1' | '6_2_6_3' | '6_4_6_5' | '6_6_plus';

export interface MeasurementValue {
  value: number;
  unit: 'cm' | 'inches';
}

export interface MerchantOutlet {
  store: string;
  url: string;
  price: number;
}

export type VerdictStatus = 'verified' | 'friendly' | 'community' | 'runs_short';

export interface FitVerdict {
  band: HeightBand;
  status: VerdictStatus;
  note?: string;
}

export interface Product {
  id: string;
  brand: string;
  title: string;
  category: string;
  subCategory?: string;      // e.g. T-Shirt, Shirt, Kurta (kept for backward compatibility)
  productSegment: string;    // e.g. Upperwear, Bottomwear, Footwear
  productType: string;       // e.g. T-Shirt, Shirt, Sneakers
  images: string[];
  occasions: string[];
  seasons: string[];
  colors: string[];
  fitType: string;           // e.g. Regular, Slim, Oversized
  retailer: string;          // Zara, H&M, Ajio, Myntra, etc.
  affiliateUrl: string;
  priceAtRetailer: number;
  measurements: Record<string, MeasurementValue>;
  verdicts: FitVerdict[];
  verifiedTier: 'verified' | 'friendly' | 'community';

  // Rich optional fields
  description?: string;
  outOfStock?: boolean;
  sizes?: string[];
  merchantLinks?: MerchantOutlet[];
  reviewsCount?: number;
  averageRating?: number;
  customReviews?: { author: string; rating: number; text: string; date: string }[];
  verificationBadges?: string[];

  // ── NEW expanded product fields ──────────────────────────
  material?: string;
  careInstructions?: string;
  weightGrams?: number;
  countryOfOrigin?: string;
  tags?: string[];
  discountPercent?: number;
  isFeatured?: boolean;
  skuCode?: string;
}

export interface CompleteFit {
  id: string;
  title: string;
  theme: string; // e.g. 'streetwear', 'ethnic'
  items: {
    role: 'shirt' | 'pant' | 'shoes' | 'watch' | 'accessory';
    productId: string;
  }[];
  stylingNotes?: string;
}

export interface UserPreferences {
  height: string;    // e.g. '6\'2"', '6\'4"'
  bodyType: 'Lean' | 'Athletic' | 'Broad' | 'Heavy';
  preferredBrands: string[];
  occasions: string[];
}
