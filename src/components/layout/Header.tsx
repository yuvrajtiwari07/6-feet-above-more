import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Ruler, Heart, Sparkles, Search, User, ChevronDown } from 'lucide-react';

export const Header: React.FC = () => {
  const { height, setHeight, navigate, savedProductIds, savedFitIds, route, user } = useApp();
  const [showHeightMenu, setShowHeightMenu] = useState(false);

  const totalSaved = savedProductIds.length + savedFitIds.length;
  const heightOptions = ["6'0", "6'1", "6'2", "6'3", "6'4", "6'5", "6'6+"];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 text-near-black backdrop-blur-xl border-b border-near-black/5 px-4 md:px-8 py-3 transition-all shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Block */}
        <div 
          onClick={() => navigate('home')} 
          className="cursor-pointer group flex items-center gap-3"
          id="lamba-logo-btn"
        >
          {/* Logo Icon representation of 6FEETABOVE (Styled from uploaded assets) */}
          <div className="relative w-10 h-10 flex items-center justify-center bg-black border border-black rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-300">
            <svg viewBox="0 0 100 100" className="w-7 h-7 text-white fill-none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="50" cy="65" r="20" className="stroke-[#FF3F6C]" fill="none" />
              <path d="M30 65 C30 44, 44 24, 62 24" className="stroke-[#FF3F6C]" />
              <path d="M48 24 L62 24 L62 38" className="stroke-[#FFCC00]" strokeWidth="8" />
              <path d="M78 12 L81 19 L88 22 L81 25 L78 32 L75 25 L68 22 L75 19 Z" fill="#FF3F6C" stroke="none" />
            </svg>
          </div>
          
          <div className="flex flex-col text-left">
            <span className="font-extrabold tracking-tighter text-md md:text-xl leading-none select-none font-display text-black">
              6Feet<span className="text-[#FF3F6C] font-extrabold">n</span>Above
            </span>
            <span className="text-[8px] uppercase tracking-[0.2em] text-black/40 font-black font-grotesk mt-0.5 leading-none">
              Clothes that finally fit
            </span>
          </div>
        </div>

        {/* Desktop Quick Search & Heights */}
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => navigate('search')}
            className={`flex items-center gap-2 text-sm font-grotesk font-black uppercase tracking-wider text-black/75 hover:text-[#FF3F6C] transition ${route.current === 'search' ? 'text-[#FF3F6C]' : ''}`}
            id="desktop-search-btn"
          >
            <Search size={15} />
            Translate Search
          </button>
          
          <button 
            onClick={() => navigate('catalog-categories')}
            className={`flex items-center gap-2 text-sm font-grotesk font-black uppercase tracking-wider text-black/75 hover:text-[#FF3F6C] transition ${route.current === 'catalog-categories' || route.current === 'catalog-list' || route.current === 'catalog-detail' ? 'text-[#FF3F6C]' : ''}`}
            id="desktop-catalogs-btn"
          >
            <Sparkles size={15} />
            Catalogs
          </button>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          
          {/* Height Pill Selector */}
          <div className="relative">
            <button
               onClick={() => setShowHeightMenu(!showHeightMenu)}
              className="flex items-center gap-1.5 bg-black hover:bg-[#FF3F6C] text-white font-grotesk font-black text-xs px-3 py-2 rounded-xl transition border border-black shadow"
              id="global-height-pill"
            >
              <Ruler size={13} className="text-[#FFCC00]" />
              <span>{height} Fit Selected</span>
              <ChevronDown size={13} className={`transition-transform duration-300 ${showHeightMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Heights Dropdown List */}
            {showHeightMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowHeightMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-black rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-black/40 font-bold mb-1 border-b border-black/10">
                    Select Your Accurate Height
                  </div>
                  {heightOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setHeight(opt);
                        setShowHeightMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-xl font-grotesk font-bold transition uppercase ${
                        height === opt 
                          ? 'bg-[#FF3F6C] text-white font-black shadow-sm' 
                          : 'text-black hover:bg-black/5'
                      }`}
                    >
                      {opt} {opt.includes('+') ? '' : 'Tall'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick Fit Finder CTA */}
          <button
            onClick={() => navigate('fit-finder')}
            className={`hidden md:flex items-center gap-1.5 bg-[#FF3F6C] text-white text-xs font-grotesk font-black tracking-wide uppercase px-4 py-2.5 rounded-xl border border-black shadow-sm hover:scale-102 transition ${route.current === 'fit-finder' ? 'ring-2 ring-black' : ''}`}
            id="header-fitfinder-btn"
          >
            Fit Finder (99% Match)
          </button>

          {/* Saved Folder Counter */}
          <button
            onClick={() => navigate('saved')}
            className="p-2 relative bg-black/5 hover:bg-black/10 rounded-xl transition text-black"
            title="Saved wardrobes"
            id="header-saved-btn"
          >
            <Heart size={18} className={totalSaved > 0 ? 'fill-[#FF3F6C] text-[#FF3F6C]' : ''} />
            {totalSaved > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FF3F6C] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce border border-white">
                {totalSaved}
              </span>
            )}
          </button>

          {/* User profile button */}
          <button
            onClick={() => navigate('profile')}
            className={`p-0.5 bg-black/5 hover:bg-black/10 rounded-full transition text-black overflow-hidden flex items-center justify-center ${route.current === 'profile' ? 'ring-2 ring-[#FF3F6C]' : ''}`}
            id="header-profile-btn"
          >
            {user && user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'Profile'} className="w-8 h-8 object-cover rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="p-2">
                <User size={18} />
              </div>
            )}
          </button>

        </div>
      </div>
    </header>
  );
};
export default Header;
