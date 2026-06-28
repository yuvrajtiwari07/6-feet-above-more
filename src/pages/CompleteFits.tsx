import React from 'react';
import { useApp } from '../context/AppContext';
import { COMPLETE_FITS } from '../data/mockData';
import { FitCard } from '../components/fits/FitCard';
import { Sparkles, ShoppingBag, HelpCircle } from 'lucide-react';

export const CompleteFits: React.FC = () => {
  const { height } = useApp();

  return (
    <div className="pb-24 pt-10 text-[#112133] w-full max-w-none mx-auto px-4 md:px-8 text-left">
      
      {/* Editorial Title */}
      <div className="border-b border-[#112133]/15 pb-6 mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={16} className="text-[#7D2AE8]" />
            <span className="text-[10px] text-[#7D2AE8] font-black uppercase tracking-[0.2em] font-sans">
              6FeetnAbove Lookbooks
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black font-display uppercase tracking-tight text-[#112133] leading-none mb-3 text-left">
            COMPLETE FITS
          </h1>
          <p className="text-xs md:text-sm text-[#112133]/60 leading-relaxed font-sans">
            Curated, fully styled combinations meticulously audited for your <strong className="text-[#7D2AE8]">{height}" frame</strong>. Each outfit has custom styling notes and separate retailer-linked specs.
          </p>
        </div>

        {/* Affiliate Disclosure callout */}
        <div className="bg-white border border-[#112133]/15 rounded-2xl p-4 flex gap-3 max-w-sm shadow-sm">
          <HelpCircle className="text-[#7D2AE8] shrink-0" size={18} />
          <div className="text-left">
            <h4 className="font-grotesk font-black text-[11px] uppercase tracking-wider text-[#7D2AE8]">
              No Grouped Checkouts
            </h4>
            <p className="text-[10px] text-[#112133]/60 leading-relaxed font-sans">
              Indian affiliate law requires that clicking "Shop" opens each item directly inside its respective official retailer portal (Zara, H&M, Myntra, etc.). Let's build your true closet.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of full-featured FitCards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {COMPLETE_FITS.map((fit) => (
          <FitCard key={fit.id} fit={fit} />
        ))}
      </div>

    </div>
  );
};
export default CompleteFits;
