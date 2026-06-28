import React from 'react';
import { useApp } from '../context/AppContext';
import { COMPLETE_FITS } from '../data/mockData';
import { ProductCard } from '../components/product/ProductCard';
import { GridDensitySelector } from '../components/layout/GridDensitySelector';
import { ArrowRight, Sparkles, Sliders, Shield, Shirt, Sparkle, Ruler, ShieldCheck, Star } from 'lucide-react';
import { motion } from 'motion/react';
import modelImg from '../../assets/model.png';

import { getProductRecommendation } from '../utils/fitEngine';

export const Home: React.FC = () => {
  const { height, bodyType, setHeight, navigate, cardSize, products } = useApp();

  // Filter 4 products that have solid verified status for the active height band
  const verifiedProducts = products.filter(p => {
    const rec = getProductRecommendation(p.verdicts, height, bodyType);
    return rec && (rec.fitRecommendation === 'Highly Recommended' || rec.fitRecommendation === 'Recommended') && !p.outOfStock;
  }).slice(0, 4);

  // Fallback: if no active verified items, show first 4 items of catalog
  const heightRailProducts = verifiedProducts.length > 0 ? verifiedProducts : products.filter(p => !p.outOfStock).slice(0, 4);

  const categories = [
    { 
      name: 'Streetwear', 
      theme: 'streetwear', 
      desc: 'Boxy silhouettes, cargo breaks & extreme oversized drops', 
      cover: 'https://images.unsplash.com/photo-1517423568366-8b83523034fd?w=600&auto=format&fit=crop', 
      span: 'md:col-span-3 lg:col-span-3',
      cardClass: 'bg-black text-white border-2 border-black hover:scale-[1.01]',
      tagColor: 'text-[#FFCC00]'
    },
    { 
      name: 'Formals', 
      theme: 'formals', 
      desc: 'Sleek premium pleats, 36L trousers & modern tailored blazers', 
      cover: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop', 
      span: 'md:col-span-3 lg:col-span-3',
      cardClass: 'bg-white text-black border-2 border-black hover:scale-[1.01]',
      tagColor: 'text-[#FFD43B] font-black'
    },
    { 
      name: 'Ethnic Wear', 
      theme: 'ethnic', 
      desc: 'Symmetrical Chikankari talls, elegant sherwanis & wedding sets', 
      cover: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop', 
      span: 'md:col-span-2 lg:col-span-2',
      cardClass: 'bg-[#FFD43B] text-black border-2 border-black hover:scale-[1.01]',
      tagColor: 'text-black font-extrabold'
    },
    { 
      name: 'Summer', 
      theme: 'summer', 
      desc: 'Light breeze sage-greens, drawstring linen and relaxed chinos', 
      cover: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop', 
      span: 'md:col-span-2 lg:col-span-2',
      cardClass: 'bg-[#00AFB9] text-white border-2 border-black hover:scale-[1.01]',
      tagColor: 'text-white'
    },
    { 
      name: 'Winter', 
      theme: 'winter', 
      desc: 'Double-breasted Italian long overcoats & high-neck merino wools', 
      cover: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600&auto=format&fit=crop', 
      span: 'md:col-span-2 lg:col-span-2',
      cardClass: 'bg-black text-white border-2 border-black hover:scale-[1.01]',
      tagColor: 'text-[#FFD43B]'
    }
  ];

  return (
    <div className="pb-24 bg-[#F9F8F6]">
      
      {/* 1. EDITORIAL BENTO GRID HERO & TRUST CORNER */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Bento Block 1: Hero Accent (col-span-12) */}
          <div className="lg:col-span-12 bg-[#0F0F10] text-white rounded-[40px] p-8 md:p-12 relative overflow-hidden group border-2 border-black pop-shadow-lg flex flex-col justify-between min-h-[560px]">
            {/* Model Background Image (absolute right-0) */}
            <div className="absolute right-0 top-0 bottom-0 w-full md:w-[45%] h-full z-0 pointer-events-none">
              <img 
                src={modelImg} 
                alt="Tall Model" 
                className="w-full h-full object-cover object-top opacity-55 md:opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#0F0F10] via-[#0F0F10]/80 to-transparent" />
            </div>

            {/* Left Content Column */}
            <div className="z-10 flex flex-col justify-between h-full flex-grow text-left">
              {/* Top Row: Badge */}
              <div className="self-start">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-2 bg-[#FFD43B] text-black border-2 border-black px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest mb-6 shadow"
                >
                  <Star size={12} className="fill-black text-black" />
                  <span>EXCLUSIVELY FOR 6FT & ABOVE</span>
                </motion.div>
              </div>

              {/* Main Content */}
              <div className="my-auto max-w-lg pr-4">
                <h1 className="text-4xl md:text-[54px] font-black text-white leading-[0.95] tracking-tighter mb-4" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                  CLOTHES THAT <br />
                  <span className="text-[#FFD43B] relative inline-block">
                    FINALLY
                    {/* Scribble/underline decoration */}
                    <span className="absolute bottom-[-6px] left-0 right-0 h-[4px] bg-[#FFD43B] rounded-full opacity-80" />
                  </span> <br />
                  FIT YOU.
                </h1>
                
                <p className="text-xs md:text-sm text-neutral-300 font-semibold leading-relaxed max-w-md mt-6 mb-8">
                  Curated clothing and accessories designed for taller frames. Better proportions, better comfort, <span className="text-[#FFD43B] font-bold">better you.</span>
                </p>

                {/* Bottom Inline Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 mb-8">
                  {[
                    { label: 'TALL FIT', desc: 'Proportions that suit you', icon: '👖' },
                    { label: 'BETTER LENGTH', desc: 'Longer sleeves, inseams & more', icon: '📏' },
                    { label: 'PREMIUM QUALITY', desc: 'Handpicked fabrics & craftsmanship', icon: '👔' },
                    { label: 'STYLE MEETS FIT', desc: 'Looks that fit. Finally.', icon: '🧥' }
                  ].map((badge, idx) => (
                    <div key={idx} className="flex flex-col text-left">
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-base mb-2 border border-white/5">
                        {badge.icon}
                      </div>
                      <span className="text-[9px] font-black uppercase text-[#FFD43B] tracking-wider">{badge.label}</span>
                      <span className="text-[8px] text-neutral-400 mt-0.5 leading-snug">{badge.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 z-20">
                <button
                  onClick={() => navigate('search')}
                  className="bg-[#FFD43B] hover:bg-[#e6be35] text-black border-2 border-black font-grotesk font-black text-xs px-8 py-4 rounded-2xl uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Explore Collection</span>
                  <ArrowRight size={14} />
                </button>

                <button
                  onClick={() => navigate('fit-finder')}
                  className="bg-transparent hover:bg-white/5 text-[#FFD43B] border-2 border-[#FFD43B] font-grotesk font-black text-xs px-8 py-4 rounded-2xl uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Find Your Perfect Fit</span>
                  <span className="text-sm">📏</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. IMMERSIVE CATEGORY PORTALS (Theme swap teasers) */}
      <section className="bg-white py-16 px-4 md:px-8 border-t-2 border-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-black text-xs font-black uppercase tracking-[0.2em] font-sans bg-[#FFD43B] px-3 py-1.5 rounded-full">
              Themed Portals
            </span>
            <h2 className="text-black font-display text-3xl md:text-5xl uppercase font-black mt-4 mb-2 tracking-tight">
              Browse Multi-Themed Worlds
            </h2>
            <p className="text-black/60 text-sm max-w-lg mx-auto">
              Each portal maps out visual specifications and curation layers dedicated to a particular dress code. Step inside your selected lookbook.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {categories.map((cat, i) => {
              const isDark = !cat.cardClass.includes('bg-white') && !cat.cardClass.includes('hover:bg-[#FAF9F6]');
              return (
                <motion.div
                  key={cat.name}
                  whileHover={{ y: -6 }}
                  onClick={() => navigate('category', { categoryName: cat.name })}
                  className={`group cursor-pointer relative aspect-[10/13] md:aspect-[3/4] rounded-[30px] overflow-hidden transition-all ${cat.span} ${cat.cardClass}`}
                  id={`cat-tile-${cat.name.replace(' ', '-').toLowerCase()}`}
                >
                  <img 
                    src={cat.cover} 
                    alt={cat.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-20 group-hover:opacity-45 transition-all duration-300 transform scale-100 group-hover:scale-105"
                  />
                  
                  {/* Asymmetrical Overlay block */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-black/90 via-black/20' : 'from-white/95 via-white/20'} to-transparent flex flex-col justify-end p-6`}>
                    <div className={`font-mono ${cat.tagColor} text-[10px] font-black uppercase tracking-widest mb-1`}>
                      World 0{i + 1}
                    </div>
                    <span className={`font-display text-2xl uppercase tracking-tighter font-black leading-tight group-hover:scale-105 transform origin-left transition duration-300 ${isDark ? 'text-white' : 'text-black'}`}>
                      {cat.name}
                    </span>
                    <p className={`text-[11px] leading-relaxed font-sans mt-1 ${isDark ? 'text-white/60' : 'text-black/75'}`}>
                      {cat.desc}
                    </p>
                    
                    <div className={`h-1.5 ${isDark ? 'bg-white/25' : 'bg-[#FFD43B]/25'} w-0 group-hover:w-full transition-all duration-300 mt-4 rounded-full`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. DYNAMIC CURATED RAIL */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between mb-8 border-b-2 border-black/15 pb-4 gap-4">
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-[#FFD43B]" />
              <span className="text-[10px] text-black/50 font-black uppercase tracking-widest font-sans">
                Human-Tested Trust
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-4xl uppercase font-black text-black" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Handpicked Outfits & Curated Fits
            </h2>
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
            <GridDensitySelector />
            <button 
              onClick={() => navigate('search')}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-black hover:text-[#FFD43B] font-grotesk transition-colors border-b-2 border-black pb-0.5 shadow-none shrink-0"
              id="see-all-verified-btn"
            >
              <span>See Full Store</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Horizontal scrollable / responsive product layout */}
        <div className={
          cardSize === 'small'
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5 md:gap-4"
            : cardSize === 'large'
              ? "grid grid-cols-1 md:grid-cols-2 gap-8"
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        }>
          {heightRailProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. BRAND CONFIDENCE STRIP */}
      <section className="py-12 bg-white border-y-2 border-black text-center px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] text-[#112133]/40 font-black uppercase tracking-[0.25em] mb-6">
            Curated affiliate partnerships with international & premium Indian retail brands
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14 opacity-50 contrast-125">
            {['ZARA', 'H&M', 'MYNTRA', 'RAYMOND', 'MANYAVAR', 'WESTSIDE', 'UNIQLO'].map((brand) => (
              <span 
                key={brand}
                className="font-display font-black text-2xl tracking-widest text-[#112133] select-none hover:opacity-100 transition duration-300"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
export default Home;
