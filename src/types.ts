export type HeightBand = '6_0_6_1' | '6_2_6_3' | '6_4_6_5' | '6_6_plus';

export interface Measurement {
  inseam?: number;       // for pants/bottoms
  totalLength?: number;  // for shirts/tops/kurtas
  sleeveLength?: number; // for long sleeves/shirts
  shoulder?: number;     // for tops
  chest?: number;        // for tops
  legOpening?: number;   // for pants
  rise?: number;         // for pants
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
  subCategory?: string; // e.g. T-Shirt, Shirt, Kurta
  images: string[];
  occasions: string[];
  seasons: string[];
  colors: string[];
  fitType: string; // e.g. Regular, Slim, Oversized
  retailer: string; // Zara, H&M, Ajio, Myntra, etc.
  affiliateUrl: string;
  priceAtRetailer: number;
  measurements: Measurement;
  verdicts: FitVerdict[];
  verifiedTier: 'verified' | 'friendly' | 'community';
  
  // Custom richer items requested by user
  description?: string;
  outOfStock?: boolean;
  sizes?: string[];
  merchantLinks?: { retailer: string; url: string; price: number }[];
  reviewsCount?: number;
  averageRating?: number;
  customReviews?: { author: string; rating: number; text: string; date: string }[];
  verificationBadges?: string[];
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
  height: string; // e.g. '6\'2"', '6\'4"'
  bodyType: 'Lean' | 'Athletic' | 'Broad' | 'Heavy';
  preferredBrands: string[];
  occasions: string[];
}
