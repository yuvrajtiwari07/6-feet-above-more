import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/product/ProductCard';
import { GridDensitySelector } from '../components/layout/GridDensitySelector';
import { Sparkles, Info, SlidersHorizontal, Shirt, ArrowRight, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Definitions for Category Immersion styling variables
interface CategoryTheme {
  bg: string;
  cardBg: string;
  text: string;
  accent: string;
  accentText: string;
  moodLabel: string;
  tagline: string;
}

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  'ethnic wear': {
    bg: 'bg-[#FDF9F3]', // Warm Peach Ivory
    cardBg: 'bg-white',
    text: 'text-[#4A2022]', // Deep Mahogany
    accent: '#7D2AE8', // Canva Purple
    accentText: 'text-[#7D2AE8]',
    moodLabel: 'CURATOR SPEC: INTU CURATED DIWALI & WEDDING ETHNIC LOOKS',
    tagline: 'Knee-length drapes & structured shoulders, calculated for broad strides.'
  },
  'formals': {
    bg: 'bg-[#F4F7FC]', // Platinum Sky
    cardBg: 'bg-white',
    text: 'text-[#112133]', // Midnight Blue
    accent: '#00C4CC', // Canva Teal
    accentText: 'text-[#7D2AE8] font-black',
    moodLabel: 'CURATOR SPEC: PREMIUM OFFICE & EXECUTIVE TUCK PATTERNS',
    tagline: 'Stay tucked all day. Extra torso lengths that sit below the hip bones.'
  },
  'streetwear': {
    bg: 'bg-[#FAF8FF]', // Pastel Lavender
    cardBg: 'bg-white',
    text: 'text-[#112133]',
    accent: '#7D2AE8',
    accentText: 'text-[#7D2AE8]',
    moodLabel: 'CURATOR SPEC: HIGH-DROP HYPES & RELAXED FIT LAYERS',
    tagline: 'True oversized profiles ending past wristbones without squeezing biceps.'
  },
  'summer': {
    bg: 'bg-[#FAF9F5]', // Oatmeal Ivory background
    cardBg: 'bg-white',
    text: 'text-[#112133]',
    accent: '#00C4CC',
    accentText: 'text-[#7D2AE8] font-black',
    moodLabel: 'CURATOR SPEC: BREATHABLE LINEN CUTS & RESORT WEAR',
    tagline: 'Breezy above-knee shorts and loose chest linen cuts that breathe.'
  },
  'winter': {
    bg: 'bg-[#F8F5F0]', // Soft Sand Cozy Beige
    cardBg: 'bg-white',
    text: 'text-[#2D1A1A]',
    accent: '#FF3E90',
    accentText: 'text-[#FF3E90]',
    moodLabel: 'CURATOR SPEC: MERINO LAYER SYSTEM & DOUBLE-BREAST DEEP SHIELDS',
    tagline: 'Overcoats with correct back pleats and wrist-guard sleeves.'
  }
};

const DEFAULT_THEME: CategoryTheme = {
  bg: 'bg-[#FAF9F6]',
  cardBg: 'bg-white',
  text: 'text-[#112133]',
  accent: '#7D2AE8',
  accentText: 'text-[#7D2AE8]',
  moodLabel: 'CURATOR SPEC: TALL SPECIFIC CLOTHING DIRECTORY',
  tagline: 'Proportional tall designs for everyday life in the subcontinent.'
};

export const Category: React.FC = () => {
  const { route, height, heightBand, navigate, cardSize, products } = useApp();

  const activeCategory = route.params?.categoryName || 'Streetwear';
  const categoryKey = activeCategory.toLowerCase();

  // Pick up immersive theme configurations
  const theme = CATEGORY_THEMES[categoryKey] || DEFAULT_THEME;

  // Track subCategory filter chips
  const [selectedSubCat, setSelectedSubCat] = useState<string>('All');

  // Filter products by main category (supporting both primary category and categories array with string normalization)
  const baseProducts = products.filter(p => {
    if (p.outOfStock) return false;
    
    const normalize = (name: string) => {
      if (!name) return '';
      return name.toLowerCase()
        .replace(/[^a-z0-9]/g, '') // remove spaces, hyphens, etc.
        .replace(/s$/, '') // singularize (e.g., formals -> formal)
        .replace(/wear$/, ''); // remove 'wear' (e.g., streetwear -> street)
    };

    const normKey = normalize(categoryKey);
    if (!normKey) return false;

    const matchPrimary = p.category && normalize(p.category).includes(normKey);
    const matchSecondary = Array.isArray(p.categories) && p.categories.some(c => c && normalize(c).includes(normKey));
    
    return matchPrimary || matchSecondary;
  });

  // Derive unique subcategories from the filtered range
  const subCategories: string[] = ['All', ...Array.from(new Set(baseProducts.map(p => p.subCategory).filter(Boolean) as string[]))];

  // Reset inner filters if user changes main category
  useEffect(() => {
    setSelectedSubCat('All');
  }, [activeCategory]);

  // Final filtered list based on subcategory chip selection
  const displayedProducts = selectedSubCat === 'All' 
    ? baseProducts 
    : baseProducts.filter(p => p.subCategory === selectedSubCat);

  // Render Category switching pills to stay highly immersive
  const navigationBubbles = [
    { name: 'Streetwear', icon: '⚡' },
    { name: 'Formals', icon: '👔' },
    { name: 'Ethnic Wear', icon: '🔱' },
    { name: 'Summer', icon: '🌴' },
    { name: 'Winter', icon: '❄️' },
    { name: 'Sneakers', icon: '👟' }
  ];

  return (
    <div className={`min-h-screen py-10 transition-colors duration-700 ${theme.bg}`}>
      
      {/* 1. IMMERSIVE CATEGORY SELECTOR HEAD - Sticky Row */}
      <div className="w-full max-w-none mx-auto px-4 md:px-8 mb-10 overflow-x-auto scroller-hide">
        <div className="flex bg-[#112133]/5 border border-[#112133]/10 rounded-full p-2 w-max mx-auto backdrop-blur-2xl">
          {navigationBubbles.map((cat) => {
            const isSel = cat.name.toLowerCase() === activeCategory.toLowerCase();
            return (
              <button
                key={cat.name}
                onClick={() => navigate('category', { categoryName: cat.name })}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-grotesk font-bold text-xs tracking-wider uppercase transition-all whitespace-nowrap ${
                  isSel 
                    ? 'bg-[#7D2AE8] text-white font-black scale-105 shadow-md' 
                    : 'text-[#112133]/75 hover:bg-[#112133]/5 hover:text-[#112133]'
                }`}
                id={`cat-nav-bubble-${cat.name.replace(' ', '-').toLowerCase()}`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-none mx-auto px-4 md:px-8">
        
        {/* 2. EDITORIAL MAGAZINE HEADER */}
        <div className="border-b border-[#112133]/15 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl text-left">
            <span className={`text-[10px] font-black tracking-[0.25em] font-sans block mb-2 px-2.5 py-1 bg-[#112133]/5 rounded-md w-max border border-[#112133]/5 ${theme.accentText}`}>
              {theme.moodLabel}
            </span>
            <h1 className={`text-5xl md:text-6xl font-black text-tall uppercase tracking-tight mt-1 mb-3 ${theme.text}`}>
              {activeCategory}
            </h1>
            <p className={`text-xs md:text-sm leading-relaxed opacity-75 ${theme.text}`}>
              {theme.tagline} Currently optimized for your selected <span className="underline font-bold text-[#7D2AE8]">{height}" Height</span>.
            </p>
          </div>

          {/* Sizing Info Panel */}
          <div className="bg-white border border-[#112133]/15 rounded-2xl p-4 flex items-center gap-3 w-full md:w-80 shadow-sm">
            <Info className="text-[#7D2AE8] shrink-0" size={18} />
            <div className="text-left text-[#112133]">
              <h4 className="font-grotesk font-black text-[11.5px] uppercase tracking-wider text-[#7D2AE8]">
                Tall Fit Assurance
              </h4>
              <p className="text-[10.5px] text-[#112133]/70 leading-relaxed font-sans">
                Measured in actual chest & shoulder ratios compared to India average models. Click specs for CM data.
              </p>
            </div>
          </div>
        </div>

        {/* 3. SUB-CATEGORY SLIDERS & ACTIVE CHIPS RAIL */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8 bg-[#112133]/5 p-3 rounded-3xl border border-[#112133]/5">
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            <SlidersHorizontal size={14} className="text-[#112133]/40 mr-1.5" />
            
            {subCategories.map((sub) => {
              if (!sub) return null;
              const isSel = selectedSubCat === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubCat(sub)}
                  className={`px-4 py-2 rounded-lg font-grotesk font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                    isSel
                      ? 'bg-[#7D2AE8] text-white font-extrabold'
                      : 'text-[#112133]/60 hover:bg-[#112133]/10 hover:text-[#112133]'
                  }`}
                  id={`cat-sub-chip-${sub.toLowerCase()}`}
                >
                  {sub}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-3.5 w-full lg:w-auto mt-2 lg:mt-0 px-2 lg:px-0">
            <span className="text-[11px] font-sans opacity-60 text-[#112133]">
              Showing {displayedProducts.length} items
            </span>
            <GridDensitySelector />
          </div>
        </div>

        {/* 4. PRODUCT MATRIX */}
        {displayedProducts.length > 0 ? (
          <div className={
            cardSize === 'small'
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5 md:gap-4"
              : cardSize === 'large'
                ? "grid grid-cols-1 md:grid-cols-2 gap-8"
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          }>
            <AnimatePresence mode="popLayout">
              {displayedProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-[#112133]/5 border border-[#112133]/10 rounded-[30px] p-16 text-center max-w-lg mx-auto my-12">
            <Shirt size={48} className="text-[#112133]/20 mx-auto mb-4 animate-bounce" />
            <h3 className="text-[#112133] font-display text-2xl uppercase tracking-wider font-bold mb-2">
              Expanding Wardrobes
            </h3>
            <p className="text-[#112133]/60 text-xs leading-relaxed max-w-xs mx-auto mb-6">
              Our fashion architects are currently human-verifying apparel in {activeCategory} right now. Click home or search to explore.
            </p>
            <button 
              onClick={() => navigate('home')}
              className="bg-[#7D2AE8] text-white hover:bg-[#6820C4] font-grotesk font-black text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider shadow-sm"
              id="empty-curation-home-btn"
            >
              Go to Homepage
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
export default Category;
