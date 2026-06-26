import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/product/ProductCard';
import { 
  Heart, ExternalLink, Ruler, CheckCircle2, ChevronRight, ChevronLeft,
  HelpCircle, ShieldCheck, AlertCircle, MessageSquare, Star, 
  PlusCircle, Loader2, LogIn, Eye
} from 'lucide-react';
import { getAccessToken } from '../supabase';
import type { UserReview } from '../types';
import { getProductRecommendation, isPositiveRecommendation, isHeightInBand } from '../utils/fitEngine';

export const ProductDetail: React.FC = () => {
  const { 
    route, 
    height, 
    bodyType,
    heightBand, 
    toggleSaveProduct, 
    savedProductIds, 
    trackAffiliateClick, 
    navigate, 
    products,
    user,
    loginWithGoogle
  } = useApp();

  const [zoomImg, setZoomImg] = useState(false);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [avgRating, setAvgRating] = useState<number>(5.0);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const touchStartRef = React.useRef<number | null>(null);
  const hasSwipedRef = React.useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
    hasSwipedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const currentX = e.targetTouches[0].clientX;
    const diffX = touchStartRef.current - currentX;
    if (Math.abs(diffX) > 10) {
      hasSwipedRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const diffX = touchStartRef.current - endX;
    
    if (Math.abs(diffX) > 40 && product && product.images) {
      setIsAutoPlayEnabled(false);
      if (diffX > 0) {
        setActiveImageIndex((prev) => (prev + 1) % product.images.length);
      } else {
        setActiveImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
      }
    }
    touchStartRef.current = null;
  };

  // Review submission state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHeight, setReviewHeight] = useState<string>(height || "6'3\"");
  const [reviewWeight, setReviewWeight] = useState<string>('');
  const [reviewBodyType, setReviewBodyType] = useState<string>('Athletic');
  const [reviewText, setReviewText] = useState<string>('');
  const [reviewError, setReviewError] = useState<string>('');
  const [reviewSuccess, setReviewSuccess] = useState<string>('');

  const productId = route.params?.productId;
  const product = products.find(p => p.id === productId);

  // Fetch reviews from API
  const fetchReviews = async () => {
    if (!productId) return;
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReviews(data.reviews || []);
          setAvgRating(data.average ?? 5.0);
          setReviewsCount(data.count ?? 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    setActiveImageIndex(0);
    setIsAutoPlayEnabled(true);
  }, [productId]);

  useEffect(() => {
    if (!isAutoPlayEnabled || !product || !product.images || product.images.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % product.images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isAutoPlayEnabled, product?.images]);

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

  // Retrieve recommendation for user selected tall selection
  const recommendation = getProductRecommendation(product.verdicts, height, bodyType);

  // Normalize and map legacy verdicts on the fly
  const normalizedVerdicts = (product.verdicts || []).map(v => {
    if (v.heightRange && v.fitRecommendation) return v;
    // Map legacy verdict
    const band = (v as any).band;
    const status = (v as any).status;
    let fitRecommendation = 'Good Fit';
    if (status === 'verified') fitRecommendation = 'Highly Recommended';
    else if (status === 'friendly') fitRecommendation = 'Recommended';
    else if (status === 'runs_short') fitRecommendation = 'Not Recommended';

    let heightRange = "6'0\" - 6'2\"";
    if (band === '6_2_6_3') heightRange = "6'2\" - 6'4\"";
    else if (band === '6_4_6_5') heightRange = "6'4\" - 6'6\"";
    else if (band === '6_6_plus') heightRange = "6'8\"+";

    return {
      heightRange,
      bodyTypes: (v as any).bodyTypes || ['Slim', 'Athletic', 'Broad', 'Overweight'],
      fitRecommendation
    };
  });

  // Convert height selections to estimate human proportions to contrast against
  const estimateAnatomy = (hStr: string) => {
    const feet = parseFloat(hStr.replace(/[^\d.]/g, '')) || 6.2;
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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess('');

    if (!reviewText.trim()) {
      setReviewError('Please write your fit review text.');
      return;
    }

    setSubmittingReview(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: reviewRating,
          height: reviewHeight,
          weight: reviewWeight,
          bodyType: reviewBodyType,
          reviewText: reviewText
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Failed to submit review');
      }

      setReviewSuccess('Thank you! Your fit review has been published.');
      setReviewText('');
      setReviewWeight('');
      setShowReviewForm(false);
      
      // Refresh reviews list
      fetchReviews();
    } catch (err: any) {
      setReviewError(err.message || 'An error occurred during submission.');
    } finally {
      setSubmittingReview(false);
    }
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
        <div className="lg:col-span-6 space-y-4">
          <div 
            onClick={(e) => {
              // If the click is on the zoom button, don't trigger prev/next
              const target = e.target as HTMLElement;
              if (target.closest('.zoom-btn-overlay')) {
                return;
              }

              setIsAutoPlayEnabled(false);
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const width = rect.width;

              if (product.images && product.images.length > 1) {
                if (x < width / 2) {
                  // Left side click -> Previous image
                  setActiveImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
                } else {
                  // Right side click -> Next image
                  setActiveImageIndex((prev) => (prev + 1) % product.images.length);
                }
              }
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="aspect-[3/4] rounded-3xl overflow-hidden bg-white border border-[#112133]/15 shadow-md relative group cursor-pointer"
          >
            {/* Left and Right navigation regions indicator overlay */}
            {product.images && product.images.length > 1 && (
              <>
                <div className="absolute inset-y-0 left-0 w-12 flex items-center justify-start pl-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-black/30 text-white p-1.5 rounded-full backdrop-blur-sm">
                    <ChevronLeft size={16} />
                  </div>
                </div>
                <div className="absolute inset-y-0 right-0 w-12 flex items-center justify-end pr-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-black/30 text-white p-1.5 rounded-full backdrop-blur-sm">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </>
            )}

            {/* Sliding Container */}
            <div 
              className="flex transition-transform duration-500 ease-out h-full w-full"
              style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
            >
              {product.images && product.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${product.title} ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover shrink-0 transition-transform duration-500 scale-100 ${
                    zoomImg && idx === activeImageIndex ? 'scale-125' : 'group-hover:scale-105'
                  }`}
                />
              ))}
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-6 flex items-center justify-between z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomImg(!zoomImg);
                }}
                className="zoom-btn-overlay flex items-center gap-1.5 text-white/95 text-[10px] font-black uppercase tracking-wider bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm transition-all border border-white/10"
              >
                <Eye size={12} />
                <span>{zoomImg ? 'Normal View' : 'Macro Zoom'}</span>
              </button>

              <span className="text-[#7D2AE8] font-bold text-xs uppercase tracking-widest bg-white/95 px-2.5 py-1 rounded-md shadow-sm">
                SPEC CURATED
              </span>
            </div>
          </div>

          {/* Thumbnails Row */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto py-1 scrollbar-none">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsAutoPlayEnabled(false);
                    setActiveImageIndex(idx);
                  }}
                  className={`relative w-16 h-20 rounded-2xl overflow-hidden border-2 bg-white transition-all shrink-0 ${
                    idx === activeImageIndex 
                      ? 'border-[#7D2AE8] scale-105 shadow-sm' 
                      : 'border-black/10 hover:border-black/35 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
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
              {product.discountPercent ? (
                <span className="text-emerald-600 text-sm font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  {product.discountPercent}% OFF
                </span>
              ) : null}
              <span className="text-[#112133]/40 text-xs font-sans">
                (Est. affiliate pricing portal)
              </span>
            </div>

            {/* Prominent Sizing Verdict indicator */}
            <div className="bg-white border border-[#112133]/15 rounded-[24px] p-6 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-3 border-b border-black/5 pb-3">
                <span className="font-grotesk font-black text-[10px] uppercase tracking-wider text-[#112133]/50">
                  VERDICT FOR YOUR PROFILE
                </span>
                
                {/* Visual badge */}
                {recommendation ? (
                  <span className={`font-black text-[10px] tracking-wide px-3 py-1 rounded-full shadow-sm uppercase ${
                    recommendation.fitRecommendation.includes('Highly')
                      ? 'bg-[#FFD43B] text-black text-white'
                      : isPositiveRecommendation(recommendation.fitRecommendation)
                        ? 'bg-[#00C4CC] text-white'
                        : 'bg-amber-500 text-white'
                  }`}>
                    {recommendation.fitRecommendation}
                  </span>
                ) : (
                  <span className="bg-[#112133]/5 text-[#112133] font-semibold text-[10px] tracking-wide px-2.5 py-1 rounded-full uppercase">
                    TALL FRIENDLY
                  </span>
                )}
              </div>

              <p className="text-[#112133]/90 text-xs font-semibold leading-relaxed mb-4">
                {recommendation ? (
                  <>
                    Based on fit curation data, this garment is rated <strong className="text-[#7D2AE8] font-black">{recommendation.fitRecommendation}</strong> for individuals measuring <strong className="font-black">{recommendation.heightRange}</strong> with a <strong className="font-black">{bodyType}</strong> build.
                  </>
                ) : (
                  "Optimized tall specifications with extended torso/inseam cuts suited for heights starting at 6'0\"."
                )}
              </p>

              {/* Full height multi-band matrix */}
              <div className="bg-[#FAF9F6] rounded-xl p-3 border border-[#112133]/5">
                <p className="text-[#112133]/50 text-[9px] font-bold uppercase tracking-wider mb-2 text-center">
                  Fits Verdict Across Tall Statures
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {normalizedVerdicts.map((v, i) => {
                    const isUserBand = isHeightInBand(height, v.heightRange);
                    const isPositive = isPositiveRecommendation(v.fitRecommendation);
                    return (
                      <div 
                        key={i}
                        className={`text-center rounded-xl p-2.5 border transition ${isUserBand ? 'border-[#7D2AE8] bg-[#7D2AE8]/5 shadow-sm' : 'border-[#112133]/10 bg-white'}`}
                      >
                        <span className="text-[10px] block font-black text-[#112133]">{v.heightRange}</span>
                        <span className={`text-[9px] block font-black uppercase mt-1 ${
                          isPositive ? 'text-[#7D2AE8]' : 'text-amber-600'
                        }`}>
                          {v.fitRecommendation}
                        </span>
                        <div className="flex flex-wrap gap-1 justify-center mt-1.5 border-t border-black/5 pt-1.5">
                          {(v.bodyTypes || []).map(bt => (
                            <span key={bt} className="bg-black/[0.04] text-black/60 text-[8px] font-bold px-1 py-0.2 rounded">
                              {bt}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Measurement analyzer vs selected height (Only if measurements present) */}
            {product.measurements && Object.keys(product.measurements).length > 0 && (
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
                        <span className="font-bold text-[#112133]">{(product.measurements.inseam as any).value ?? product.measurements.inseam} cm (36L Inches)</span>
                      </div>
                      <div className="h-2 bg-[#FAF9F6] rounded-full overflow-hidden relative border border-[#112133]/10">
                        <div className="absolute top-0 bottom-0 left-0 bg-[#00C4CC]" style={{ width: `${(Number((product.measurements.inseam as any).value ?? product.measurements.inseam) / 100) * 100}%` }} />
                        <div className="absolute top-0 bottom-0 w-0.5 bg-[#7D2AE8]" style={{ left: `${(currentAnatomy.idealInseam / 100) * 100}%` }} title={`Ideal for ${height}`} />
                      </div>
                    </div>
                  )}

                  {/* Torso Total Length */}
                  {product.measurements.totalLength && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#112133]/60">Garment Torso Length:</span>
                        <span className="font-bold text-[#112133]">{(product.measurements.totalLength as any).value ?? product.measurements.totalLength} cm</span>
                      </div>
                      <div className="h-2 bg-[#FAF9F6] rounded-full overflow-hidden relative border border-[#112133]/10">
                        <div className="absolute top-0 bottom-0 left-0 bg-[#00C4CC]" style={{ width: `${(Number((product.measurements.totalLength as any).value ?? product.measurements.totalLength) / 130) * 100}%` }} />
                        <div className="absolute top-0 bottom-0 w-0.5 bg-[#7D2AE8]" style={{ left: `${(currentAnatomy.idealTorso / 130) * 100}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Sleeve Length */}
                  {product.measurements.sleeveLength && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#112133]/60">Garment Arm Sleeve Length:</span>
                        <span className="font-bold text-[#112133]">{(product.measurements.sleeveLength as any).value ?? product.measurements.sleeveLength} cm</span>
                      </div>
                      <div className="h-2 bg-[#FAF9F6] rounded-full overflow-hidden relative border border-[#112133]/10">
                        <div className="absolute top-0 bottom-0 left-0 bg-[#00C4CC]" style={{ width: `${(Number((product.measurements.sleeveLength as any).value ?? product.measurements.sleeveLength) / 80) * 100}%` }} />
                        <div className="absolute top-0 bottom-0 w-0.5 bg-[#7D2AE8]" style={{ left: `${(currentAnatomy.idealSleeve / 80) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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

      {/* USER REVIEWS SYSTEM (NEW) */}
      <section className="mt-16 bg-white border border-[#112133]/15 rounded-[32px] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/10 pb-5 mb-8 gap-4">
          <div>
            <h2 className="font-display text-2xl uppercase font-black text-[#112133] flex items-center gap-2">
              <MessageSquare size={20} className="text-[#7D2AE8]" />
              <span>CITIZEN FIT REVIEWS ({reviewsCount})</span>
            </h2>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-black/55 font-bold">
              <div className="flex text-amber-500">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    size={14} 
                    className={star <= Math.round(avgRating) ? 'fill-amber-500' : 'text-black/15'} 
                  />
                ))}
              </div>
              <span>{avgRating.toFixed(1)} / 5.0 rating based on real citizen fits</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (!user) {
                loginWithGoogle();
              } else {
                setShowReviewForm(!showReviewForm);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#7D2AE8] hover:bg-[#6820C4] text-white text-xs font-grotesk font-black uppercase tracking-wider rounded-xl transition"
          >
            {user ? (
              <><PlusCircle size={14} /> Write A Review</>
            ) : (
              <><LogIn size={14} /> Log In to Review</>
            )}
          </button>
        </div>

        {/* Review Form */}
        {showReviewForm && user && (
          <form onSubmit={handleSubmitReview} className="mb-8 p-5 bg-[#FAF9F6] rounded-2xl border border-black/5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#7D2AE8]">Submit Fit Report</h3>
            
            {reviewError && <div className="p-3 bg-red-100 text-red-700 text-xs font-bold rounded-lg">{reviewError}</div>}
            {reviewSuccess && <div className="p-3 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">{reviewSuccess}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-black/45 font-bold block mb-1">Rating</label>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-bold bg-white"
                >
                  <option value={5}>5 Stars (Flawless Tall Fit)</option>
                  <option value={4}>4 Stars (Good Length)</option>
                  <option value={3}>3 Stars (Acceptable)</option>
                  <option value={2}>2 Stars (Runs slightly short)</option>
                  <option value={1}>1 Star (Too short / Boxy)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-black/45 font-bold block mb-1">Your Height</label>
                <select
                  value={reviewHeight}
                  onChange={(e) => setReviewHeight(e.target.value)}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-bold bg-white"
                >
                  {["6'0", "6'1", "6'2", "6'3", "6'4", "6'5", "6'6", "6'7", "6'8+"].map(hOpt => (
                    <option key={hOpt} value={hOpt}>{hOpt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-black/45 font-bold block mb-1">Body Build</label>
                <select
                  value={reviewBodyType}
                  onChange={(e) => setReviewBodyType(e.target.value)}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-bold bg-white"
                >
                  <option value="Slim">Slim Build</option>
                  <option value="Athletic">Athletic Build</option>
                  <option value="Broad">Broad Shoulders</option>
                  <option value="Heavy Build">Heavy Build</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-black/45 font-bold block mb-1">Weight (optional)</label>
                <input
                  type="text"
                  value={reviewWeight}
                  onChange={(e) => setReviewWeight(e.target.value)}
                  placeholder="e.g. 85 kg"
                  className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-bold bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-black/45 font-bold block mb-1">Fit Comments</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="How does the length feel on you? Sleeves, inseam, torso riding etc..."
                rows={3}
                className="w-full px-3.5 py-2.5 border border-black/15 rounded-lg text-xs font-sans"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submittingReview}
                className="px-4 py-2 bg-[#7D2AE8] hover:bg-[#6820C4] text-white text-xs font-grotesk font-black uppercase tracking-wider rounded-lg disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Post Fit Report'}
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="px-4 py-2 bg-black/5 text-black/75 text-xs font-grotesk font-black uppercase tracking-wider rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Reviews List */}
        {loadingReviews ? (
          <div className="py-6 text-center text-xs text-black/45 flex justify-center items-center gap-1.5 font-bold">
            <Loader2 size={16} className="animate-spin text-[#7D2AE8]" />
            <span>Retrieving citizen reports...</span>
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-5 border border-black/10 rounded-2xl bg-white text-xs text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[#7D2AE8] bg-[#7D2AE8]/10 border border-[#7D2AE8]/20 px-2 py-0.5 rounded-md text-[10px]">
                      {rev.height || '6\'3"'}
                    </span>
                    <span className="text-black/55 font-bold">
                      {rev.bodyType || 'Athletic'} Build {rev.weight ? `(${rev.weight})` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <div className="flex text-amber-500">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                          key={star} 
                          size={12} 
                          className={star <= rev.rating ? 'fill-amber-500' : 'text-black/15'} 
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-black/45 font-mono ml-1">
                      {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>

                <p className="text-black/90 font-sans leading-relaxed">
                  "{rev.reviewText}"
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-black/40 italic">
            No citizen reports submitted for this garment yet. Be the first to verify its fit.
          </div>
        )}
      </section>

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
