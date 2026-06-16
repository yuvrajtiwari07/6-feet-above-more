// src/lib/importers/types.ts
// Core contracts for the product importer system

/**
 * Normalized product data extracted from any retailer URL.
 * All fields are optional — importers return what they can extract.
 * Future AI enhancements (tall-score, occasion classification, etc.)
 * can be added here without changing any importer implementation.
 */
export interface ImportedProduct {
  brand?: string;
  title?: string;
  category?: string;
  subCategory?: string;
  description?: string;

  price?: number;
  discountPercent?: number;
  originalPrice?: number;

  images?: string[];

  colors?: string[];
  sizes?: string[];

  material?: string;
  careInstructions?: string;

  averageRating?: number;
  reviewsCount?: number;

  tags?: string[];
  occasions?: string[];
  seasons?: string[];

  measurements?: Record<string, any>;

  retailer?: string;
  retailerUrl?: string;

  // Future AI enhancement fields (reserved for later use)
  tallFriendlyScore?: number;         // 0-100
  heightRecommendations?: string[];   // e.g. ["6'0\"", "6'3\""]
  bodyTypeRecommendations?: string[]; // e.g. ["Athletic", "Slim"]
  aiGeneratedTags?: string[];
  occasionClassification?: string[];
  styleClassification?: string[];
}

/**
 * Core interface every retailer importer must implement.
 * Adding a new retailer = implement this interface + register in ImporterFactory.
 */
export interface ProductImporter {
  /** Returns true if this importer can handle the given URL */
  canHandle(url: string): boolean;

  /** Fetches and normalizes product data from the URL */
  importProduct(url: string): Promise<ImportedProduct>;

  /** Human-readable name for the retailer (shown in UI) */
  readonly retailerName: string;
}

/** Response shape from the import API endpoint */
export interface ImportApiResponse {
  success: boolean;
  product?: ImportedProduct;
  retailerName?: string;
  error?: string;
}
