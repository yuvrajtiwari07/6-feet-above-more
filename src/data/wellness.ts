// src/data/wellness.ts
// Single source of truth for the wellness vertical taxonomy — nutrition,
// body care and health care. Shared by the storefront, the search facets and
// the admin form. Keep this file dependency-free: mobile/lib/data/wellness.ts
// is a straight copy of it.

export interface WellnessCategory {
  name: string;
  icon: string;
  desc: string;
  /** Card background, text and accent used by the category tiles/headers. */
  bg: string;
  text: string;
  accent: string;
  /** Product types offered in the admin dropdown for this category. */
  types: string[];
}

export const WELLNESS_CATEGORIES: WellnessCategory[] = [
  {
    name: 'Nutrition & Foods',
    icon: '🥗',
    desc: 'Everyday food that actually does something — superfoods, nuts, health drinks & clean staples',
    bg: '#0E7C5A', text: '#FFFFFF', accent: '#FFD43B',
    types: [
      'Protein Snack', 'Dry Fruits & Nuts', 'Health Drink', 'Coffee & Tea',
      'Breakfast & Cereal', 'Superfood', 'Cooking Essentials', 'Functional Gum',
    ],
  },
  {
    name: 'Supplements & Sports Nutrition',
    icon: '💪',
    desc: 'Protein, vitamins and performance stacks for training, recovery and daily gaps',
    bg: '#112133', text: '#FFFFFF', accent: '#FFD43B',
    types: [
      'Whey Protein', 'Mass Gainer', 'Multivitamin', 'Omega & Fish Oil',
      'Pre-Workout', 'Creatine', 'Collagen', 'Kids Nutrition', 'Gummies',
    ],
  },
  {
    name: 'Ayurveda & Herbal',
    icon: '🌿',
    desc: 'Classical formulations — ashwagandha, chyawanprash, herbal juices and oils',
    bg: '#5B8C2A', text: '#FFFFFF', accent: '#FFD43B',
    types: [
      'Ayurvedic Churna', 'Herbal Juice', 'Ashwagandha & Adaptogens',
      'Chyawanprash', 'Herbal Tablets', 'Ayurvedic Oil',
    ],
  },
  {
    name: 'Health Care & Diagnostics',
    icon: '🩺',
    desc: 'Lab tests, full-body checkups, OTC medicine and home health devices',
    bg: '#0B6FA4', text: '#FFFFFF', accent: '#FFD43B',
    types: [
      'Lab Test Package', 'Full Body Checkup', 'OTC Medicine',
      'Health Device', 'Wellness Membership',
    ],
  },
  {
    name: 'Skin Care',
    icon: '✨',
    desc: 'Serums, sunscreens and routines built around your actual skin concern',
    bg: '#FFD43B', text: '#111111', accent: '#7D2AE8',
    types: [
      'Face Serum', 'Face Wash', 'Moisturiser', 'Sunscreen',
      'Face Mask', 'Body Lotion', 'Toner', 'Makeup',
    ],
  },
  {
    name: 'Hair & Grooming',
    icon: '💈',
    desc: 'Hair fall, dandruff, beard and styling — for men and women',
    bg: '#7D2AE8', text: '#FFFFFF', accent: '#FFD43B',
    types: [
      'Shampoo', 'Conditioner', 'Hair Oil', 'Hair Serum',
      'Beard Care', 'Styling', 'Hair Colour',
    ],
  },
  {
    name: 'Body Care & Hygiene',
    icon: '🧼',
    desc: 'Body wash, oral care, intimate hygiene, sexual wellness and baby care',
    bg: '#00AFB9', text: '#FFFFFF', accent: '#112133',
    types: [
      'Body Wash', 'Soap', 'Deodorant', 'Intimate Hygiene',
      'Oral Care', 'Sexual Wellness', 'Baby Care', 'Home Hygiene',
    ],
  },
];

export const WELLNESS_CATEGORY_NAMES = WELLNESS_CATEGORIES.map(c => c.name);

/** Product `form` — how the thing physically arrives. */
export const WELLNESS_FORMS = [
  'Powder', 'Capsule', 'Tablet', 'Gummy', 'Liquid', 'Syrup', 'Serum',
  'Cream', 'Gel', 'Oil', 'Bar', 'Spray', 'Kit', 'Service',
];

/** What the customer is trying to fix — the primary browse axis for wellness. */
export const WELLNESS_CONCERNS = [
  'Hair Fall', 'Dandruff', 'Acne', 'Pigmentation', 'Dry Skin', 'Anti-Ageing',
  'Sun Protection', 'Immunity', 'Gut Health', 'Sleep', 'Energy & Stamina',
  'Muscle Gain', 'Weight Loss', 'Joint & Bone', 'Stress & Focus',
  'Diabetes Care', 'Heart Health', "Women's Health", "Men's Health", 'Kids Growth',
];

export const WELLNESS_DIET_TAGS = [
  'Veg', 'Vegan', 'Sugar Free', 'Gluten Free', 'Dairy Free',
  'No Preservatives', 'Organic', 'Clinically Tested', 'Dermat Tested', 'Cruelty Free',
];

export function getWellnessCategory(name?: string): WellnessCategory | undefined {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  return WELLNESS_CATEGORIES.find(c => c.name.toLowerCase() === key);
}

export function isWellnessCategory(name?: string): boolean {
  return !!getWellnessCategory(name);
}

/** Product types for a category, or every type when no category is given. */
export function wellnessTypesFor(category?: string): string[] {
  const cat = getWellnessCategory(category);
  if (cat) return cat.types;
  return Array.from(new Set(WELLNESS_CATEGORIES.flatMap(c => c.types)));
}
