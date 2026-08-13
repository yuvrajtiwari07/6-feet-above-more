// src/lib/garmentVersatility.ts
// Smart defaults for a garment's broad categories/occasions/seasons, keyed by
// its detected product type. Most everyday basics suit almost every context —
// a polo t-shirt is not "just casual", it works for office, travel, dates,
// parties and daily wear alike. Only genuinely narrow items (kurtas, blazers,
// heavy outerwear) get a tight default.
//
// Used both server-side (fallback curation, bulk import) and client-side
// (Admin import auto-classification) so imports don't need per-field manual
// tagging for garments that are obviously versatile.

export interface VersatilityDefaults {
  /** Broad multi-select categories (the BROAD_CATEGORIES vocabulary). */
  categories: string[];
  occasions: string[];
  seasons: string[];
}

/** Every occasion this app tracks, except the two that are genuinely narrow. */
const GENERAL_OCCASIONS = [
  'Daily Wear', 'Office', 'Travel', 'Date Night', 'Party',
  'Outdoor', 'Business Casual', 'Work From Home', 'Vacation',
];

const NON_WINTER_SEASONS = ['Summer', 'Monsoon', 'Spring', 'Autumn', 'All Season'];
const ALL_SEASONS = ['Summer', 'Winter', 'Monsoon', 'Spring', 'Autumn', 'All Season'];

/** Product types versatile enough to suit nearly every occasion/category. */
const VERSATILE: Record<string, VersatilityDefaults> = {
  'T-Shirt':  { categories: ['Casual Wear', 'Athleisure', 'Streetwear'], occasions: GENERAL_OCCASIONS, seasons: NON_WINTER_SEASONS },
  'Polo':     { categories: ['Casual Wear', 'Business Casual'], occasions: GENERAL_OCCASIONS, seasons: NON_WINTER_SEASONS },
  'Henley':   { categories: ['Casual Wear'], occasions: GENERAL_OCCASIONS, seasons: NON_WINTER_SEASONS },
  'Shirt':    { categories: ['Formal Wear', 'Business Casual', 'Casual Wear'], occasions: GENERAL_OCCASIONS, seasons: ALL_SEASONS },
  'Jeans':    { categories: ['Casual Wear', 'Streetwear'], occasions: GENERAL_OCCASIONS, seasons: ALL_SEASONS },
  'Chinos':   { categories: ['Casual Wear', 'Business Casual'], occasions: GENERAL_OCCASIONS, seasons: ALL_SEASONS },
  'Joggers':  { categories: ['Athleisure', 'Casual Wear', 'Streetwear'], occasions: ['Daily Wear', 'Gym', 'Travel', 'Outdoor', 'Work From Home', 'Vacation'], seasons: ALL_SEASONS },
  'Cargo Pants': { categories: ['Streetwear', 'Casual Wear'], occasions: ['Daily Wear', 'Travel', 'Outdoor', 'Vacation'], seasons: ALL_SEASONS },
  'Sneakers': { categories: ['Casual Wear', 'Athleisure', 'Streetwear'], occasions: ['Daily Wear', 'Gym', 'Travel', 'Outdoor', 'Vacation'], seasons: ALL_SEASONS },
};

/** Product types that are genuinely occasion/season-specific. */
const NARROW: Record<string, VersatilityDefaults> = {
  'Trousers':     { categories: ['Formal Wear', 'Business Casual'], occasions: ['Office', 'Business Casual', 'Party'], seasons: ['All Season'] },
  'Shorts':       { categories: ['Casual Wear', 'Athleisure'], occasions: ['Daily Wear', 'Gym', 'Vacation', 'Outdoor'], seasons: ['Summer', 'Monsoon'] },
  'Kurta':        { categories: ['Ethnic Wear'], occasions: ['Wedding', 'Festive', 'Daily Wear'], seasons: ['All Season'] },
  'Kurta Set':    { categories: ['Ethnic Wear'], occasions: ['Wedding', 'Festive'], seasons: ['All Season'] },
  'Nehru Jacket': { categories: ['Ethnic Wear'], occasions: ['Wedding', 'Festive', 'Party'], seasons: ['All Season'] },
  'Hoodie':       { categories: ['Streetwear', 'Winter Wear'], occasions: ['Daily Wear', 'Travel', 'Outdoor', 'Work From Home'], seasons: ['Winter', 'Monsoon', 'Autumn'] },
  'Sweatshirt':   { categories: ['Streetwear', 'Winter Wear'], occasions: ['Daily Wear', 'Travel', 'Work From Home'], seasons: ['Winter', 'Monsoon', 'Autumn'] },
  'Jacket':       { categories: ['Winter Wear', 'Outdoor Wear'], occasions: ['Travel', 'Outdoor', 'Daily Wear'], seasons: ['Winter', 'Monsoon'] },
  'Overshirt':    { categories: ['Streetwear', 'Casual Wear'], occasions: ['Daily Wear', 'Travel'], seasons: ['Winter', 'Autumn', 'Spring'] },
  'Formal Shoes': { categories: ['Formal Wear', 'Business Casual'], occasions: ['Office', 'Wedding', 'Party', 'Business Casual'], seasons: ['All Season'] },
  'Loafers':      { categories: ['Formal Wear', 'Business Casual'], occasions: ['Office', 'Party', 'Business Casual'], seasons: ['All Season'] },
  'Boots':        { categories: ['Streetwear', 'Outdoor Wear'], occasions: ['Travel', 'Outdoor', 'Daily Wear'], seasons: ['Winter', 'Monsoon'] },
  'Belt':         { categories: ['Formal Wear', 'Casual Wear'], occasions: ['Office', 'Daily Wear'], seasons: ['All Season'] },
  'Cap':          { categories: ['Casual Wear', 'Athleisure'], occasions: ['Daily Wear', 'Travel', 'Gym', 'Outdoor'], seasons: ['Summer', 'Monsoon'] },
  'Wallet':       { categories: ['Formal Wear', 'Casual Wear'], occasions: ['Office', 'Daily Wear'], seasons: ['All Season'] },
  'Socks':        { categories: ['Casual Wear'], occasions: ['Daily Wear'], seasons: ['All Season'] },
};

/** Returns smart category/occasion/season defaults for a detected product type, or null if unknown. */
export function getGarmentVersatilityDefaults(productType: string | undefined): VersatilityDefaults | null {
  if (!productType) return null;
  return VERSATILE[productType] ?? NARROW[productType] ?? null;
}
