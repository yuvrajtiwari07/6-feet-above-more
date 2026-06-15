import React from 'react';
import { useApp } from '../context/AppContext';
import { COMPLETE_FITS } from '../data/mockData';
import { ProductCard } from '../components/product/ProductCard';
import { GridDensitySelector } from '../components/layout/GridDensitySelector';
import { ArrowRight, Sparkles, Sliders, Shield, Shirt, Sparkle, Ruler } from 'lucide-react';
import { motion } from 'motion/react';

export const Home: React.FC = () => {
  const { height, setHeight, heightBand, navigate, cardSize, products } = useApp();

  // Filter 4 products that have solid verified status for the active height band
  const verifiedProducts = products.filter(p => {
    const verdict = p.verdicts.find(v => v.band === heightBand);
    return verdict?.status === 'verified' && !p.outOfStock;
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
      tagColor: 'text-[#FF3F6C] font-black'
    },
    { 
      name: 'Ethnic Wear', 
      theme: 'ethnic', 
      desc: 'Symmetrical Chikankari talls, elegant sherwanis & wedding sets', 
      cover: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop', 
      span: 'md:col-span-2 lg:col-span-2',
      cardClass: 'bg-[#FF3F6C] text-white border-2 border-black hover:scale-[1.01]',
      tagColor: 'text-[#FFCC00] font-extrabold'
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
      tagColor: 'text-[#FF3F6C]'
    }
  ];

  return (
    <div className="pb-24 bg-[#F9F8F6]">
      
      {/* 1. EDITORIAL BENTO GRID HERO & TRUST CORNER */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Bento Block 1: Hero Accent (col-span-8) */}
          <div className="lg:col-span-8 bg-black text-white rounded-[36px] p-8 md:p-12 relative overflow-hidden group border-2 border-black pop-shadow-lg flex flex-col justify-between min-h-[480px]">
            {/* Visual backdrop patterns */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/10 to-[#FF3F6C]/10 z-10 pointer-events-none"></div>
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none opacity-5">
              <div className="absolute text-[8vw] font-black select-none leading-none tracking-tighter" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                LIMITLESS CURATION
              </div>
            </div>

            {/* Top Row: Sparkle sticker */}
            <div className="z-20 self-start">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 bg-[#FFCC00] text-black border-2 border-black px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest mb-4 shadow"
              >
                <Sparkle size={12} className="text-[#FF3F6C] fill-[#FF3F6C]" />
                <span>{"INDIA'S EXCLUSIVE COOPERATIVE FIT FOR >= 6'0\""}</span>
              </motion.div>
            </div>

            {/* Bottom Row: Text content & CTA */}
            <div className="z-20 text-left mt-8">
              <h1 className="text-4xl md:text-6xl font-black text-white leading-[0.95] tracking-tighter mb-4" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                CLOTHES THAT <br />
                <span className="text-[#FF3F6C]">FINALLY</span> FIT.
              </h1>
              
              <p className="text-sm md:text-base text-white/80 font-sans leading-relaxed max-w-xl mb-8">
                Tired of ordering five sizes just to send all back? Enjoy physical specs carefully tape-audited by real partners so long sleeves, inseams and collar widths drape tall statures beautifully with zero standard ride-ups. 
              </p>

              <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                <button
                  onClick={() => navigate('fit-finder')}
                  className="bg-white hover:bg-[#FF3F6C] hover:text-white border-2 border-black text-black font-grotesk font-black text-xs px-8 py-4 rounded-2xl uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2"
                  id="hero-fit-finder-btn"
                >
                  <span>Anatomy Fit Finder</span>
                  <Ruler size={14} className="text-[#FF3F6C]" />
                </button>
                
                <button
                  onClick={() => navigate('search')}
                  className="bg-[#FF3F6C] border-2 border-black text-white font-grotesk font-black text-xs px-8 py-4 rounded-2xl transition hover:bg-[#e0305a] flex items-center justify-center gap-2"
                  id="hero-browse-btn"
                >
                  <span>Filter Catalogue</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Bento Block 2: Tall Verified Trust Ladder (col-span-4) */}
          <div className="lg:col-span-4 bg-white rounded-[36px] p-8 text-black flex flex-col justify-between border-2 border-black pop-shadow min-h-[480px]">
            <div>
              <div className="flex items-center gap-3.5 mb-6">
                <div className="bg-[#FF3F6C] text-white p-3 rounded-2xl border-2 border-black">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10zM9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-black" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                  Premium Tall assurance
                </h3>
              </div>

              <p className="font-semibold text-xs leading-relaxed text-black/70 mb-8 font-sans">
                Our bespoke tape measurement guidelines ensure every single garment matches authentic tall proportions before being curated.
              </p>

              <div className="space-y-4 font-grotesk font-bold">
                <div className="flex items-center justify-between border-b border-black/10 pb-3">
                  <span className="text-[11px] uppercase tracking-wider text-black/50">Trousers Inseam</span>
                  <span className="text-xs font-mono font-black text-black bg-[#FFCC00] px-2 py-0.5 rounded border border-black/10">34L / 36L / 38L Inches</span>
                </div>
                <div className="flex items-center justify-between border-b border-black/10 pb-3">
                  <span className="text-[11px] uppercase tracking-wider text-black/50">Torso Tail drop</span>
                  <span className="text-xs font-mono font-black text-black">+8cm extra tuck height</span>
                </div>
                <div className="flex items-center justify-between border-b border-black/10 pb-3">
                  <span className="text-[11px] uppercase tracking-wider text-black/50">Sleeve coverage</span>
                  <span className="text-xs font-mono font-black text-black">Extended wrist drape</span>
                </div>
                <div className="flex items-center justify-between border-b border-black/10 pb-3">
                  <span className="text-[11px] uppercase tracking-wider text-black/50">Sizing Calibration</span>
                  <span className="text-xs font-mono font-black text-black">Ergonomic loose gussets</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] font-black uppercase text-black/60 tracking-widest font-mono mt-6 border-t border-black/15 pt-4 text-left">
              Calibrated for {height} Active Frame
            </div>
          </div>

        </div>
      </section>

      {/* 2. PERSISTENT CONTOURED HEIGHT SELECTOR STRIP */}
      <section className="bg-white text-near-black py-10 px-4 md:px-8 border-y border-[#112133]/5 relative overflow-hidden" id="height-selector-strip">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div className="text-center lg:text-left">
            <h2 className="text-[#112133] font-display text-2xl uppercase tracking-tight font-extrabold mb-1">
              Refine Fit Verdicts
            </h2>
            <p className="text-[#112133]/60 text-xs font-sans">
              Adjusting your stats immediately adapts all item suitability ratings across the platform.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {["6'0", "6'1", "6'2", "6'3", "6'4", "6'5", "6'6+"].map((h) => {
              const isActive = height === h;
              return (
                <button
                  key={h}
                  onClick={() => setHeight(h)}
                  className={`px-5 py-3 rounded-2xl font-grotesk font-black text-xs md:text-sm tracking-wide transition relative overflow-hidden hover:scale-105 active:scale-95 ${
                    isActive 
                      ? 'bg-[#FF3F6C] text-white font-extrabold border-2 border-black shadow' 
                      : 'bg-white text-black border-2 border-black/10 hover:border-black'
                  }`}
                  id={`home-height-btn-${h.replace('+', 'plus')}`}
                >
                  {h}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Subtle decorative background vector */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF3F6C]/5 rounded-full filter blur-3xl" />
      </section>

      {/* 3. DYNAMIC "VERIFIED FOR YOUR HEIGHT" RAIL */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between mb-8 border-b-2 border-black/15 pb-4 gap-4">
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-[#FF3F6C]" />
              <span className="text-[10px] text-black/50 font-black uppercase tracking-widest font-sans">
                Human-Tested Trust
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-4xl uppercase font-black text-black" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Verified Fits Configured For <span className="text-[#FF3F6C] underline decoration-black decoration-2">{height}"</span> Frame
            </h2>
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
            <GridDensitySelector />
            <button 
              onClick={() => navigate('search')}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-black hover:text-[#FF3F6C] font-grotesk transition-colors border-b-2 border-black pb-0.5 shadow-none shrink-0"
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

      {/* 4. IMMERSIVE CATEGORY PORTALS (Theme swap teasers) */}
      <section className="bg-white py-16 px-4 md:px-8 border-t-2 border-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[#FF3F6C] text-xs font-black uppercase tracking-[0.2em] font-sans bg-[#FF3F6C]/10 px-3 py-1.5 rounded-full">
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
                    
                    <div className={`h-1.5 ${isDark ? 'bg-white/25' : 'bg-[#FF3F6C]/25'} w-0 group-hover:w-full transition-all duration-300 mt-4 rounded-full`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. BRAND CONFIDENCE STRIP */}
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
