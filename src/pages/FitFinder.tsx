import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { COMPLETE_FITS } from '../data/mockData';
import { ProductCard } from '../components/product/ProductCard';
import { FitCard } from '../components/fits/FitCard';
import { Ruler, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FitFinder: React.FC = () => {
  const { height, setHeight, bodyType, setBodyType, navigate, products } = useApp();
  
  // Conversational Steps: 1 = Height, 2 = Body Type, 3 = Occasion, 4 = Loader, 5 = Recommendations
  const [step, setStep] = useState<number>(1);
  const [selectedOccasion, setSelectedOccasion] = useState<string>('Casual');
  const [loadingProgress, setLoadingProgress] = useState(0);

  const heights = ["6'0", "6'1", "6'2", "6'3", "6'4", "6'5", "6'6+"];
  
  const bodies: { name: 'Lean' | 'Athletic' | 'Broad' | 'Heavy'; desc: string; icon: string }[] = [
    { name: 'Lean', desc: 'Sleek, slim frame. Sizing concerns: flapping sleeve margins & torso ballooning.', icon: '📐' },
    { name: 'Athletic', desc: 'Broad chest, tapered waist. Sizing concerns: underarm tightness & shoulder roll-up.', icon: '⚡' },
    { name: 'Broad', desc: 'Sturdy, wide shoulder skeletal structure. Sizing concerns: tight arm-holes or restriction.', icon: '🏛️' },
    { name: 'Heavy', desc: 'Muscular or broad torso girth. Sizing concerns: shirts staying tucked & chest button strain.', icon: '⚖️' }
  ];

  const occasions = [
    { name: 'Casual', desc: 'Daywear, travel layers & premium weekend brunches.' },
    { name: 'Office', desc: 'Boardroom structured shirts, blazers & crease dress pants.' },
    { name: 'Wedding', desc: 'Draped celebratory Indian Chikankari sets & sangeet looks.' },
    { name: 'College', desc: 'Hypebeast streetwear oversized hoodies, tees & cargos.' }
  ];

  // Simulated fitting analysis
  const startLoadingSimulation = () => {
    setStep(4);
    setLoadingProgress(0);
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setStep(5), 600);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  // Filter recommendations based on compiled stats
  const getPersonalizedResults = () => {
    // Return fits that match our selection
    const fittingOccasions: Record<string, string> = {
      'Casual': 'summer',
      'Office': 'formals',
      'Wedding': 'ethnic',
      'College': 'streetwear'
    };
    
    const targetTheme = fittingOccasions[selectedOccasion] || 'summer';
    const suggestedFits = COMPLETE_FITS.filter(f => f.theme === targetTheme);
    const fallbackFits = COMPLETE_FITS.slice(0, 1);

    // Filter products that fit body type characteristics
    // e.g. Lean -> slim fit, Athletic -> Regular, Broad or Heavy -> Relaxed or Oversized
    const suggestedProducts = products.filter(p => {
      if (p.outOfStock) return false;
      if (bodyType === 'Lean') return p.fitType.toLowerCase().includes('slim') || p.fitType.toLowerCase().includes('classic');
      if (bodyType === 'Athletic') return !p.fitType.toLowerCase().includes('oversized');
      return p.fitType.toLowerCase().includes('relaxed') || p.fitType.toLowerCase().includes('oversized') || p.fitType.toLowerCase().includes('loose');
    }).slice(0, 4);

    return {
      fits: suggestedFits.length > 0 ? suggestedFits : fallbackFits,
      products: suggestedProducts.length > 0 ? suggestedProducts : products.filter(p => !p.outOfStock).slice(0, 4)
    };
  };

  const results = getPersonalizedResults();

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 md:px-8 bg-off-white text-[#112133]">
      <div className="max-w-4xl w-full">
        
        <AnimatePresence mode="wait">
          
          {/* STEP 1: CONVERSATIONAL HEIGHT SELECT */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <div className="inline-flex p-4 bg-[#7D2AE8]/5 border border-[#7D2AE8]/10 rounded-full text-[#7D2AE8] mb-6">
                <Ruler size={24} />
              </div>
              <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight mb-2">
                First, what is your accurate height?
              </h1>
              <p className="text-[#112133]/60 text-xs mb-8 max-w-md mx-auto">
                No rounding down. We customize chest-to-waist ratios based on actual bone length measurements.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mb-10">
                {heights.map((h) => (
                  <button
                    key={h}
                    onClick={() => setHeight(h)}
                    className={`p-4 rounded-xl font-grotesk font-black tracking-wide text-sm transition-all relative ${
                      height === h 
                        ? 'bg-[#7D2AE8] text-white scale-105 shadow-md shadow-[#7D2AE8]/15' 
                        : 'bg-white border border-[#112133]/10 text-[#112133]/80 hover:bg-[#FAF9F6]'
                    }`}
                  >
                    {h} tall
                    {height === h && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="bg-[#7D2AE8] text-white font-grotesk font-black text-xs px-10 py-4 rounded-xl uppercase tracking-wider hover:bg-[#6820C4] transition shadow-md shadow-[#7D2AE8]/10"
                id="fitfinder-step1-next"
              >
                Continue Frame Setup
              </button>
            </motion.div>
          )}

          {/* STEP 2: BODY PROFILE */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-left max-w-2xl mx-auto"
            >
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-[#112133]/60 hover:text-[#112133] text-xs font-bold uppercase tracking-wider mb-6">
                <ArrowLeft size={16} /> Previous
              </button>

              <h1 className="text-4xl font-black font-display uppercase tracking-tight mb-2">
                Choose your shoulder & torso morphology
              </h1>
              <p className="text-[#112133]/60 text-xs mb-8">
                Talls need different sleeve-drops depending on rib cage girth. Select closest profile.
              </p>

              <div className="flex flex-col gap-3 mb-8">
                {bodies.map((b) => {
                  const isSel = bodyType === b.name;
                  return (
                    <div
                      key={b.name}
                      onClick={() => setBodyType(b.name)}
                      className={`cursor-pointer p-5 rounded-2xl border transition-all flex gap-4 items-center ${
                        isSel 
                          ? 'border-[#7D2AE8] bg-[#7D2AE8]/5' 
                          : 'border-[#112133]/10 bg-white hover:bg-[#FAF9F6]'
                      }`}
                      id={`bodytype-tile-${b.name.toLowerCase()}`}
                    >
                      <span className="text-2xl">{b.icon}</span>
                      <div className="flex-grow">
                        <h4 className="font-grotesk font-black text-sm uppercase tracking-wider text-[#112133]">
                          {b.name} Frame
                        </h4>
                        <p className="text-[#112133]/60 text-[11px] leading-relaxed mt-0.5">
                          {b.desc}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isSel ? 'border-[#7D2AE8] bg-[#7D2AE8] text-white' : 'border-[#112133]/20'
                      }`}>
                        {isSel && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center">
                <button
                  onClick={() => setStep(3)}
                  className="bg-[#7D2AE8] text-white font-grotesk font-black text-xs px-10 py-4 rounded-xl uppercase tracking-wider hover:bg-[#6820C4] transition shadow-md shadow-[#7D2AE8]/10"
                  id="fitfinder-step2-next"
                >
                  Continue to aesthetics Focus
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: OCCASION FOCUS */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-left max-w-2xl mx-auto"
            >
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-[#112133]/60 hover:text-[#112133] text-xs font-bold uppercase tracking-wider mb-6">
                <ArrowLeft size={16} /> Previous
              </button>

              <span className="text-[#7D2AE8] text-xs font-black uppercase tracking-[0.2em] font-sans">
                Curator Focus
              </span>
              <h1 className="text-4xl font-black font-display uppercase tracking-tight mt-1 mb-2">
                What is your upcoming style priority?
              </h1>
              <p className="text-[#112133]/60 text-xs mb-8">
                Our database will prioritize and compile fit recommendations around this focal occasion.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {occasions.map((occ) => {
                  const isSel = selectedOccasion === occ.name;
                  return (
                    <div
                      key={occ.name}
                      onClick={() => setSelectedOccasion(occ.name)}
                      className={`cursor-pointer p-5 rounded-2xl border transition-all ${
                        isSel 
                          ? 'border-[#7D2AE8] bg-[#7D2AE8]/5 shadow-md' 
                          : 'border-[#112133]/10 bg-white hover:bg-[#FAF9F6]'
                      }`}
                      id={`occasion-tile-${occ.name.toLowerCase()}`}
                    >
                      <h3 className="font-grotesk font-black text-base uppercase tracking-wider text-[#112133]">
                        {occ.name}
                      </h3>
                      <p className="text-[#112133]/60 text-xs leading-relaxed mt-2 font-sans">
                        {occ.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="text-center">
                <button
                  onClick={startLoadingSimulation}
                  className="bg-[#00C4CC] text-white font-grotesk font-black text-sm px-12 py-4 rounded-xl uppercase tracking-widest hover:bg-[#00B2B8] hover:scale-105 active:scale-95 transition"
                  id="fitfinder-step3-next"
                >
                  Generate Sizing Report
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: ANIMATED METER METRIC CALCULATION LOADER */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center max-w-sm mx-auto"
            >
              <RefreshCw size={48} className="text-[#7D2AE8] mx-auto mb-6 animate-spin duration-3000" />
              
              <h2 className="text-[#112133] font-display text-2xl uppercase tracking-widest mb-2 font-bold">
                RECALIBRATING GARMENT DATA
              </h2>
              <p className="text-[#112133]/50 text-[11px] uppercase tracking-widest font-mono mb-6">
                Matching {height}" with {bodyType} anatomy rules...
              </p>

              <div className="h-2 w-full bg-[#112133]/5 border border-[#112133]/10 rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-[#7D2AE8] transition-all" style={{ width: `${loadingProgress}%` }} />
              </div>

              <div className="text-[10.5px] text-[#112133]/60 font-mono text-left space-y-1 bg-[#FAF9F6] border border-[#112133]/10 p-4 rounded-xl">
                <div>[COM] Loading Manyavar Chikankari armholes (71cm)...</div>
                {loadingProgress > 30 && <div>[COM] Calibrating Zara Navy Trench Waist drop (+4cm)...</div>}
                {loadingProgress > 60 && <div>[COM] Checking Westside oatmeal linen bungees...</div>}
                {loadingProgress > 90 && <div>[COM] Finalizing Complete Fits lookbooks...</div>}
              </div>
            </motion.div>
          )}

          {/* STEP 5: PERSONALIZED FIT VIEWER */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-left"
            >
              {/* Header result row */}
              <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#112133]/15 pb-6 mb-10 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="text-[#7D2AE8]" size={16} />
                    <span className="text-[10px] text-[#7D2AE8] font-bold uppercase tracking-widest font-grotesk bg-[#7D2AE8]/5 border border-[#7D2AE8]/10 px-2.5 py-0.5 rounded">
                      Tall Report Ready
                    </span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight text-[#112133] leading-none">
                    COMPLIED CANVAS FOR {height}"
                  </h1>
                  <p className="text-[#112133]/60 text-xs mt-1.5">
                    Profile: <strong className="text-[#112133]">{bodyType} Frame</strong> with priority on <strong className="text-[#112133]">{selectedOccasion} Curation</strong>. Custom layout compiled:
                  </p>
                </div>

                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 bg-white hover:bg-[#FAF9F6] border border-[#112133]/15 px-4 py-2.5 rounded-xl font-grotesk font-bold text-xs uppercase tracking-wider text-[#112133] transition"
                >
                  <RefreshCw size={12} />
                  <span>Configure Frame Again</span>
                </button>
              </div>

              {/* Outfit lookbook recommendation */}
              <div className="mb-12">
                <h3 className="text-[#112133]/50 text-[10px] font-black uppercase tracking-widest font-grotesk border-b border-[#112133]/10 pb-2 mb-6">
                  Recommended Fit Build Lookbook
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {results.fits.map((fit) => (
                    <FitCard key={fit.id} fit={fit} />
                  ))}
                </div>
              </div>

              {/* Garment list recommendation */}
              <div>
                <h3 className="text-[#112133]/50 text-[10px] font-black uppercase tracking-widest font-grotesk border-b border-[#112133]/10 pb-2 mb-6">
                  Recommended Standalone Garment Options
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {results.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </div>
  );
};
export default FitFinder;
