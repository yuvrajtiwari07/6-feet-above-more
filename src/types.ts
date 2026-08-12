export type HeightBand = '6_0_6_1' | '6_2_6_3' | '6_4_6_5' | '6_6_plus';

/**
 * The two storefronts. `fashion` is the original tall-only (6ft+) catalogue;
 * `wellness` covers nutrition, body care and health care and is for everyone.
 */
export type Vertical = 'fashion' | 'wellness';

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
  // New fitEngine fields
  heightRange?: string;
  bodyTypes?: ('Slim' | 'Athletic' | 'Broad' | 'Overweight')[];
  fitRecommendation?: string;
  note?: string;

  // Legacy fields
  band?: HeightBand;
  status?: VerdictStatus;
}

export interface Product {
  id: string;
  vertical?: Vertical;            // defaults to 'fashion' server-side
  brand: string;
  title: string;
  category: string;              // primary category (backward compat)
  categories?: string[];          // multi-select categories
  subCategory?: string;
  productSegment: string;         // Upperwear, Bottomwear, Footwear, etc.
  productType: string;            // T-Shirt, Jeans, Sneakers, etc.
  images: string[];
  occasions: string[];
  seasons: string[];
  colors: string[];
  fitType: string;
  retailer: string;
  affiliateUrl: string;
  priceAtRetailer: number;
  measurements?: Record<string, MeasurementValue | number>;
  verdicts: FitVerdict[];
  verifiedTier: 'verified' | 'friendly' | 'community';

  // Rich optional fields
  description?: string;
  outOfStock?: boolean;
  sizes?: string[];
  merchantLinks?: MerchantOutlet[];
  reviewsCount?: number;
  averageRating?: number;
  verificationBadges?: string[];
  material?: string;
  tags?: string[];
  discountPercent?: number;
  isFeatured?: boolean;

  // Tall-fit curation fields (fashion only)
  tallFriendly?: boolean;
  heightRanges?: string[];
  bodyTypes?: string[];
  fitHighlights?: string[];

  // Wellness curation fields (nutrition / body care / health care only)
  form?: string;                  // Powder, Capsule, Serum, Oil…
  netQuantity?: string;           // "60 capsules", "1 kg", "100 ml"
  concerns?: string[];            // Hair Fall, Immunity, Gut Health…
  keyIngredients?: string[];      // Whey Isolate, Niacinamide…
  dietTags?: string[];            // Veg, Vegan, Sugar Free…
}

export interface UserReview {
  id: string;
  productId: string;
  userId?: string;
  userEmail?: string;
  rating: number;
  height?: string;
  weight?: string;
  bodyType?: string;
  reviewText?: string;
  createdAt: string;
}

export interface CompleteFit {
  id: string;
  title: string;
  theme: string;
  items: {
    role: 'shirt' | 'pant' | 'shoes' | 'watch' | 'accessory';
    productId: string;
  }[];
  stylingNotes?: string;
}

export interface UserPreferences {
  height: string;
  bodyType: 'Lean' | 'Athletic' | 'Broad' | 'Heavy';
  preferredBrands: string[];
  occasions: string[];
}

export interface CatalogCategory {
  id: string;
  vertical?: Vertical;
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Catalog {
  id: string;
  vertical?: Vertical;
  title: string;
  slug: string;
  description?: string;
  categoryId?: string;
  categoryName: string;
  coverImage?: string;
  productIds: string[];
  affiliateUrl?: string;   // EarnKaro whole-catalog link
  isPublished: boolean;
  sortOrder: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
