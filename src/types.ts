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
  heightRange: string;
  bodyTypes: ('Slim' | 'Athletic' | 'Broad' | 'Overweight')[];
  fitRecommendation: string;
}

export interface Product {
  id: string;
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

  // Tall-fit curation fields
  tallFriendly?: boolean;
  heightRanges?: string[];
  bodyTypes?: string[];
  fitHighlights?: string[];
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
