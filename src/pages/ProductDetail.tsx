import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/product/ProductCard';
import { Heart, ExternalLink, Ruler, CheckCircle2, ChevronRight, HelpCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const ProductDetail: React.FC = () => {
  const { route, height, heightBand, toggleSaveProduct, savedProductIds, trackAffiliateClick, navigate, products } = useApp();
  const [zoomImg, setZoomImg] = useState(false);

  const productId = route.params?.productId;
  const product = products.find(p => p.id === productId);

  if (!product) {
    return (
      <div className="py-24 px-4 text-center">
        <AlertCircle size={48} className="text-accent-coral mx-auto mb-4 animate-bounce" />
        <h2 className="text-[#112133] font-display text-3xl uppercase tracking-wider mb-2">Garment Not Found</h2>
        <p className="text-[#112133]/60 text-xs mb-6">The requested tall product may have sold out or been un-curated.</p>
        <button onClick={() => navigate('home')} className="bg-[#7D2AE8] text-white font-grotesk font-black text-xs px-6 py-3 rounded-xl uppercase">
          Go To Homepage
        </button>
      </div>
    );
  }

  const isSaved = savedProductIds.includes(product.id);

  // Filter 4 similar items in the same general category for "You Might Also Fit"
  const similarProducts = products
    .filter(p => p.category === product.category && p.id !== product.id && !p.outOfStock)
    .slice(0, 4);

  // Retrieve verdict for user selected tall selection
  const userVerdict = product.verdicts.find(v => v.band === heightBand) || {
    status: 'community' as const,
    note: 'Generous sizing proportions calculated perfectly for larger statures.'
  };

  // Convert height selections to estimate human proportions to contrast against
  const estimateAnatomy = (hStr: string) => {
    // Basic heuristics for tall stature proportions in cm
    const feet = parseFloat(hStr.replace(/[^\d.]/g, ''));
    if (hStr.includes("6'0") || hStr.includes("6'1")) {
      return { idealInseam: 81, idealTorso: 74, idealSleeve: 65 };
    }
    if (hStr.includes("6'2") || hStr.includes("6'3")) {
      return { idealInseam: 84, idealTorso: 77, idealSleeve: 68 };
    }
    if (hStr.includes("6'4") || hStr.includes("6'5")) {
      return { idealInseam: 88, idealTorso: 80, idealSleeve: 71 };
    }
    return { idealInseam: 92, idealTorso: 83, idealSleeve: 74 }; // 6'6"+
  };

  const currentAnatomy = estimateAnatomy(height);

  const handleShopNow = () => {
    trackAffiliateClick(product.id, product.retailer, product.affiliateUrl);
    window.open(product.affiliateUrl, '_blank', 'referrerPolicy');
  };

  return (
    <div className="pb-24 pt-8 max-w-7xl mx-auto px-4 md:px-8 text-left text-[#112133]">
      
      {/* 1. BREADCRUMBS RAIL */}
      <div className="flex items-center gap-1.5 text-xs text-[#112133]/50 mb-8 font-grotesk font-bold">
        <span className="hover:text-[#7D2AE8] cursor-pointer" onClick={() => navigate('home')}>HOME</span>
        <ChevronRight size={12} />
        <span className="hover:text-[#7D2AE8] cursor-pointer uppercase" onClick={() => navigate('category', { categoryName: product.category })}>{product.category}</span>
        <ChevronRight size={12} />
        <span className="text-[#7D2AE8] uppercase truncate">{product.title}</span>
      </div>

      {/* 2. PRIMARY DETAIL CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
        
        {/* Left Aspect: Zoomable Image Showcase */}
        <div className="lg:col-span-6">
          <div 
            onClick={() => setZoomImg(!zoomImg)}
            className="aspect-[3/4] rounded-3xl overflow-hidden bg-white border border-[#112133]/15 shadow-md relative group cursor-zoom-in"
          >
            <img
              src={product.images[0]}
              alt={product.title}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover transition-transform duration-500 scale-100 ${zoomImg ? 'scale-125' : 'group-hover:scale-105'}`}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-6 flex items-center justify-between pointer-events-none">
              <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider">
                {zoomImg ? 'Click to reset lens look' : 'Click frame to engage deep macro zoom'}
              </span>
              <span className="text-[#7D2AE8] font-bold text-xs uppercase tracking-widest bg-white/95 px-2.5 py-1 rounded-md shadow-sm">
                SPEC CURATED
              </span>
            </div>
          </div>
        </div>

        {/* Right Aspect: Specs & Projections Sheet */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#7D2AE8] font-grotesk font-black text-xs tracking-widest uppercase border border-[#7D2AE8]/20 px-2 py-0.5 rounded bg-[#7D2AE8]/5">
                {product.brand}
              </span>
              <span className="text-[#112133]/50 text-xs font-mono">
                Source: {product.retailer}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black font-display tracking-tight text-[#112133] uppercase leading-none mb-4">
              {product.title}
            </h1>

            {/* Price Tag & Affiliate Info */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-black font-grotesk text-[#7D2AE8]">
                ₹{product.priceAtRetailer.toLocaleString('en-IN')}
              </span>
              <span className="text-[#112133]/40 text-xs font-sans">
                (Est. affiliate pricing portal)
              </span>
            </div>

            {/* Prominent Sizing Verdict indicator */}
            <div className="bg-white border border-[#112133]/15 rounded-[24px] p-6 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-3 border-b border-[#112133]/10 pb-3">
                <span className="font-grotesk font-black text-[11px] uppercase tracking-wider text-[#112133]/50">
                  VERDICT FOR YOUR ACTIVE HEIGHT Band
                </span>
                
                {/* Visual badge */}
                {userVerdict.status === 'verified' && (
                  <span className="bg-[#7D2AE8] text-white font-black text-[10px] tracking-wide px-3 py-1 rounded shadow-md shadow-[#7D2AE8]/10">
                    TALL VERIFIED
                  </span>
                )}
                {userVerdict.status === 'friendly' && (
                  <span className="border border-[#7D2AE8] text-[#7D2AE8] font-bold text-[10px] tracking-wide px-3 py-0.8 rounded">
                    TALL FRIENDLY
                  </span>
                )}
                {userVerdict.status === 'community' && (
                  <span className="bg-[#112133]/5 text-[#112133] font-semibold text-[10px] tracking-wide px-2.5 py-1 rounded-full">
                    COMMUNITY APPROVED
                  </span>
                )}
                {userVerdict.status === 'runs_short' && (
                  <span className="bg-accent-coral text-white font-bold text-[9px] tracking-wider px-2.5 py-1 rounded">
                    RUNS CUT SHORT
                  </span>
                )}
              </div>

              <p className="text-[#112133]/90 text-sm leading-relaxed mb-4">
                "{userVerdict.note || 'No compromises. Designed with a longer drop that perfectly sits around tall frames without standard riding.'}"
              </p>

              {/* Full height multi-band matrix (requested feature!) */}
              <div className="bg-[#FAF9F6] rounded-xl p-3 border border-[#112133]/5">
                <p className="text-[#112133]/50 text-[9px] font-bold uppercase tracking-wider mb-2 text-center">
                  Fits Verdict Across Tall Statures
                </p>
                
                <div className="grid grid-cols-4 gap-2">
                  {product.verdicts.map((v) => {
                    const isUserBand = v.band === heightBand;
                    const bandLabel = v.band === '6_0_6_1' ? "6'0-6'1" : v.band === '6_2_6_3' ? "6'2-6'3" : v.band === '6_4_6_5' ? "6'4-6'5" : "6'6+";
                    return (
                      <div 
                        key={v.band}
                        className={`text-center rounded p-2 border transition ${isUserBand ? 'border-[#7D2AE8] bg-[#7D2AE8]/5' : 'border-[#112133]/10 bg-[#112133]/5'}`}
                      >
                        <span className="text-[10px] block font-bold text-[#112133]/55">{bandLabel}</span>
                        <span className={`text-[10px] block font-black uppercase mt-0.5 ${
                          v.status === 'verified' ? 'text-[#7D2AE8]' : v.status === 'friendly' ? 'text-[#00C4CC]' : 'text-[#112133]/40'
                        }`}>
                          {v.status.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Measurement analyzer vs selected height */}
            <div className="bg-white border border-[#112133]/15 rounded-[24px] p-6 mb-6 shadow-sm">
              <h3 className="font-grotesk font-black text-xs uppercase tracking-wide text-[#7D2AE8] mb-4 flex items-center gap-1.5 text-left">
                <Ruler size={14} />
                <span>PHYSICAL SPECIFICATIONS VS YOUR {height}" ANATOMY</span>
              </h3>

              <div className="flex flex-col gap-4 text-left">
                {/* Trouser Inseam */}
                {product.measurements.inseam && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#112133]/60">Garment Leg Inseam:</span>
                      <span className="font-bold text-[#112133]">{product.measurements.inseam} cm (36L Inches)</span>
                    </div>
                    <div className="h-2 bg-[#FAF9F6] rounded-full overflow-hidden relative border border-[#112133]/10">
                      <div className="absolute top-0 bottom-0 left-0 bg-[#00C4CC]" style={{ width: `${(product.measurements.inseam / 100) * 100}%` }} />
                      <div className="absolute top-0 bottom-0 w-0.5 bg-[#7D2AE8]" style={{ left: `${(currentAnatomy.idealInseam / 100) * 100}%` }} title={`Ideal for ${height}`} />
                    </div>
                    <span className="text-[10px] text-[#112133]/60 leading-relaxed block mt-1.5">
                      Average {height} stride needs {currentAnatomy.idealInseam}cm. Garment yields <strong className="text-[#7D2AE8]">+{product.measurements.inseam - currentAnatomy.idealInseam}cm</strong> drape break.
                    </span>
                  </div>
                )}

                {/* Torso Total Length */}
                {product.measurements.totalLength && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#112133]/60">Garment Torso Length:</span>
                      <span className="font-bold text-[#112133]">{product.measurements.totalLength} cm</span>
                    </div>
                    <div className="h-2 bg-[#FAF9F6] rounded-full overflow-hidden relative border border-[#112133]/10">
                      <div className="absolute top-0 bottom-0 left-0 bg-[#00C4CC]" style={{ width: `${(product.measurements.totalLength / 130) * 100}%` }} />
                      <div className="absolute top-0 bottom-0 w-0.5 bg-[#7D2AE8]" style={{ left: `${(currentAnatomy.idealTorso / 130) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-[#112133]/60 leading-relaxed block mt-1.5">
                      Your torso needs {currentAnatomy.idealTorso}cm. Garment yields <strong className="text-[#7D2AE8]">+{product.measurements.totalLength - currentAnatomy.idealTorso}cm</strong> extra tuck space. No riding up.
                    </span>
                  </div>
                )}

                {/* Sleeve Length */}
                {product.measurements.sleeveLength && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#112133]/60">Garment Arm Sleeve Length:</span>
                      <span className="font-bold text-[#112133]">{product.measurements.sleeveLength} cm</span>
                    </div>
                    <div className="h-2 bg-[#FAF9F6] rounded-full overflow-hidden relative border border-[#112133]/10">
                      <div className="absolute top-0 bottom-0 left-0 bg-[#00C4CC]" style={{ width: `${(product.measurements.sleeveLength / 80) * 100}%` }} />
                      <div className="absolute top-0 bottom-0 w-0.5 bg-[#7D2AE8]" style={{ left: `${(currentAnatomy.idealSleeve / 80) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-[#112133]/60 leading-relaxed block mt-1.5">
                      Your long arms need {currentAnatomy.idealSleeve}cm. Garment provides <strong className="text-[#7D2AE8]">+{product.measurements.sleeveLength - currentAnatomy.idealSleeve}cm</strong> wrist coverage.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. TRANSITION ACTION BLOCK */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full text-left">
            {/* Quick Toggle Save */}
            <button
              onClick={() => toggleSaveProduct(product.id)}
              className="basis-1/5 flex items-center justify-center p-4 bg-white hover:bg-[#FAF9F6] rounded-xl border border-[#112133]/15 text-[#112133] transition active:scale-95 shadow-sm"
              id="product-detail-save-btn"
            >
              <Heart size={20} className={isSaved ? 'fill-accent-coral text-accent-coral' : ''} />
              <span className="ml-2 text-xs uppercase tracking-wider font-bold">
                {isSaved ? 'Saved' : 'Save'}
              </span>
            </button>

            {/* Main tracked exit link */}
            <button
              onClick={handleShopNow}
              className="basis-4/5 flex items-center justify-center gap-2 bg-[#00C4CC] hover:bg-[#00B2B8] text-white font-grotesk font-black text-sm p-4 rounded-xl shadow-md shadow-[#00C4CC]/15 hover:scale-[1.02] transform active:scale-95 transition text-left"
              id="product-detail-shop-btn"
            >
              <span>Shop on {product.retailer}</span>
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. SIMILAR RECOMMENDATIONS */}
      {similarProducts.length > 0 && (
        <section className="mt-16 text-left">
          <div className="border-b border-[#112133]/15 pb-4 mb-8">
            <h2 className="font-display text-2xl uppercase font-black text-[#112133] text-left">
              Sizing Alternatives: "You Might Also Fit"
            </h2>
            <p className="text-[#112133]/50 text-[11px] font-sans text-left">
              Garments in {product.category} which feature matching high physical specification tolerances.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {similarProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
};
export default ProductDetail;
