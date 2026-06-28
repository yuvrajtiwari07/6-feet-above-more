import React from 'react';
import { useApp } from '../context/AppContext';
import { Ruler, ShieldCheck, Activity, LogOut, CheckCircle2, Cloud, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const Profile: React.FC = () => {
  const { 
    height, setHeight, 
    bodyType, setBodyType, 
    preferences, updatePreferences,
    savedProductIds, savedFitIds, 
    clickLogs, navigate,
    user, loadingFirebase, loginWithGoogle, logout,
    isAdmin
  } = useApp();

  const heights = ["6'0", "6'1", "6'2", "6'3", "6'4", "6'5", "6'6+"];
  const bodyTypes: ('Lean' | 'Athletic' | 'Broad' | 'Heavy')[] = ['Lean', 'Athletic', 'Broad', 'Heavy'];
  
  const partnerBrands = ['Zara', 'H&M', 'Manyavar', 'Raymond', 'Westside', 'Uniqlo', 'Levis', 'Nike', 'Adidas'];
  const trackingOccasions = ['Office', 'Casual', 'Wedding', 'Festive', 'Date Night', 'Travel', 'Gym'];

  // Toggle brand selections
  const handleBrandToggle = async (brand: string) => {
    const list = preferences.preferredBrands || [];
    const updated = list.includes(brand) 
      ? list.filter(b => b !== brand) 
      : [...list, brand];
    await updatePreferences({ preferredBrands: updated });
  };

  // Toggle occasion selections
  const handleOccasionToggle = async (occ: string) => {
    const list = preferences.occasions || [];
    const updated = list.includes(occ) 
      ? list.filter(o => o !== occ) 
      : [...list, occ];
    await updatePreferences({ occasions: updated });
  };

  return (
    <div className="pb-24 pt-10 text-[#112133] w-full max-w-none mx-auto px-4 md:px-8 text-left">
      
      {/* 1. TITLE DASHBOARD HEADER & STATS */}
      <div className="border-b border-[#112133]/15 pb-6 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Ruler size={16} className="text-[#D5A021]" />
            <span className="text-[10px] text-[#D5A021] font-black uppercase tracking-[0.2em] font-sans">
              Your Tall Profile Calibration
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black font-display uppercase tracking-tight text-[#112133] leading-none mb-3 text-left">
            MY LOCKER
          </h1>
          <p className="text-xs md:text-sm text-[#112133]/60 leading-relaxed font-sans">
            Adjust sizing presets, select favorite brands, and audit tracked merchant routing exits.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white p-4 rounded-3xl border border-[#112133]/15 text-center shadow-sm min-w-24">
            <div className="text-3xl font-black text-[#D5A021] font-grotesk">{savedProductIds.length}</div>
            <div className="text-[9px] text-[#112133]/40 font-bold uppercase tracking-wider mt-1">Saved Items</div>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-[#112133]/15 text-center shadow-sm min-w-24">
            <div className="text-3xl font-black text-[#00C4CC] font-grotesk">{savedFitIds.length}</div>
            <div className="text-[9px] text-[#112133]/40 font-bold uppercase tracking-wider mt-1">Saved Looks</div>
          </div>
        </div>
      </div>

      {/* CLOUD PAIRING / GOOGLE AUTHENTICATION INTEGRATION */}
      <div className="mb-10">
        {loadingFirebase ? (
          <div className="bg-black/5 rounded-3xl p-6 flex items-center justify-center border border-black/5 animate-pulse">
            <span className="text-xs font-grotesk font-black uppercase tracking-wider text-black/45">Loading Secure Authentication...</span>
          </div>
        ) : user ? (
          <>
            <div className="bg-emerald-50/50 border border-emerald-500/25 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-left w-full md:w-auto">
                <div className="relative">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-14 h-14 rounded-full border-2 border-emerald-500" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-lg uppercase font-grotesk">
                      {user.email ? user.email[0] : 'U'}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-grotesk font-black text-lg text-[#112133] leading-tight">
                      {user.displayName || '6FT Account'}
                    </h4>
                    <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <Cloud size={10} />
                      <span>Cloud Synced</span>
                    </span>
                  </div>
                  <p className="text-xs text-black/55 mt-0.5 font-sans truncate max-w-xs md:max-w-md">
                    Securely logged in as <strong className="text-black">{user.email}</strong>. Calibration and Lookbook saved in Firestore.
                  </p>
                </div>
              </div>
              
              <button
                onClick={logout}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-black/5 hover:bg-black/10 text-black border border-black/10 text-xs font-grotesk font-black uppercase tracking-wider transition-all duration-300 shadow-none shrink-0"
                id="firebase-logout-btn"
              >
                <LogOut size={14} />
                <span>Disconnect Locker</span>
              </button>
            </div>
            {isAdmin && (
              <div className="bg-[#7D2AE8]/10 border border-[#7D2AE8]/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 mt-6">
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 bg-[#7D2AE8] rounded-full animate-ping"></span>
                    <h4 className="font-grotesk font-black uppercase tracking-wider text-sm text-[#7D2AE8]">
                      Admin Privileges Unlocked
                    </h4>
                  </div>
                  <p className="text-xs text-black/75 font-sans leading-relaxed max-w-xl">
                    You are signed in as an administrator (<strong className="text-black">{user.email}</strong>). You can add, edit, or remove tall apparel pieces, change pricing information and sites, and toggle stock logs.
                  </p>
                </div>
                
                <button
                  onClick={() => navigate('admin')}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#7D2AE8] hover:bg-[#6a20c9] text-white text-xs font-grotesk font-black uppercase tracking-wider transition-all duration-300 shadow-sm shrink-0"
                  id="profile-admin-portal-btn"
                >
                  <ShieldCheck size={14} />
                  <span>Enter Admin Panel</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-gradient-to-r from-[#7D2AE8]/5 via-[#00C4CC]/5 to-transparent border border-[#7D2AE8]/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <Cloud size={16} className="text-[#7D2AE8]" />
                <h4 className="font-grotesk font-black uppercase tracking-wide text-sm text-[#7D2AE8]">
                  Durable Cloud Backup
                </h4>
              </div>
              <p className="text-xs text-black/75 font-sans leading-relaxed max-w-xl">
                By pairing your account, we securely sync your precise sizing profiles, preferred brands, and custom lookbook combinations onto Cloud Firestore, guaranteeing zero loss when moving across desktop and mobile devices.
              </p>
            </div>
            
            <button
              onClick={() => loginWithGoogle()}
              className="w-full md:w-auto flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-black text-white hover:bg-[#7D2AE8] text-xs font-grotesk font-black uppercase tracking-wider transition-all duration-300 shadow-sm shrink-0"
              id="firebase-login-btn"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.47 1.638l2.45-2.45C17.38 1.63 14.96 1 12.24 1c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.772 0 10.155-4.05 10.155-10 0-.615-.055-1.2-.172-1.715H12.24z"/>
              </svg>
              <span>Connect with Google</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Calibration controls */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Sizing presets controller */}
          <div className="bg-white border border-[#112133]/15 rounded-3xl p-6 shadow-sm">
            <h3 className="font-display text-xl uppercase tracking-wider font-bold mb-4 border-b border-[#112133]/10 pb-2 text-[#7D2AE8] text-left">
              Sizing Diagnostics
            </h3>

            {/* Height presets */}
            <div className="mb-6">
              <label className="text-[10px] text-[#112133]/50 font-black uppercase tracking-widest block mb-1.5 font-mono">
                Active Tall Height:
              </label>
              <div className="flex flex-wrap gap-2">
                {heights.map((h) => {
                  const isSel = height === h;
                  return (
                    <button
                      key={h}
                      onClick={() => setHeight(h)}
                      className={`px-4 py-2.5 text-xs rounded-xl font-grotesk font-black tracking-wider uppercase transition-all duration-300 ${
                        isSel ? 'bg-[#7D2AE8] text-white font-extrabold shadow-sm' : 'bg-[#112133]/5 hover:bg-[#112133]/10 text-[#112133]/70'
                      }`}
                      id={`height-btn-${h.replace('+', '-plus')}`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Body Morph types */}
            <div>
              <label className="text-[10px] text-[#112133]/50 font-black uppercase tracking-widest block mb-1.5 font-mono">
                Rib-cage & Torso Girth:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {bodyTypes.map((bt) => {
                  const isSel = bodyType === bt;
                  return (
                    <button
                      key={bt}
                      onClick={() => setBodyType(bt)}
                      className={`py-3.5 px-2 rounded-xl text-xs font-grotesk font-bold transition-all duration-300 ${
                        isSel ? 'bg-[#00C4CC] text-white font-black' : 'bg-[#112133]/5 hover:bg-[#112133]/10 text-[#112133]/70'
                      }`}
                      id={`bodytype-btn-${bt.toLowerCase()}`}
                    >
                      {bt} Shoulder
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Preferences selects */}
          <div className="bg-white border border-[#112133]/15 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-sm">
            
            {/* Preferred Partner Brands */}
            <div>
              <h3 className="font-display text-lg uppercase tracking-wider font-bold mb-3 border-b border-[#112133]/10 pb-2 text-left">
                Partner Brand Preferences
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {partnerBrands.map((brand) => {
                  const isChecked = (preferences.preferredBrands || []).includes(brand);
                  return (
                    <button
                      key={brand}
                      onClick={() => handleBrandToggle(brand)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-sans transition font-bold uppercase tracking-wide ${
                        isChecked ? 'bg-[#7D2AE8] text-white font-extrabold' : 'bg-[#112133]/5 hover:bg-[#112133]/10 text-[#112133]/60'
                      }`}
                      id={`brand-tag-${brand.toLowerCase()}`}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ocassion Focus presets */}
            <div>
              <h3 className="font-display text-lg uppercase tracking-wider font-bold mb-3 border-b border-[#112133]/10 pb-2 text-left">
                Occasion Targets
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {trackingOccasions.map((occ) => {
                  const isChecked = (preferences.occasions || []).includes(occ);
                  return (
                    <button
                      key={occ}
                      onClick={() => handleOccasionToggle(occ)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-sans transition font-bold uppercase tracking-wide ${
                        isChecked ? 'bg-[#00C4CC] text-white font-extrabold' : 'bg-[#112133]/5 hover:bg-[#112133]/10 text-[#112133]/60'
                      }`}
                      id={`occasion-tag-${occ.replace(' ', '-').toLowerCase()}`}
                    >
                      {occ}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Affiliate tracking diagnostic logs */}
        <div className="lg:col-span-4 bg-white border border-[#112133]/15 rounded-3xl p-6 shadow-sm">
          <h3 className="font-display text-xl uppercase tracking-wider font-bold mb-1 text-[#7D2AE8] flex items-center gap-1.5 text-left">
            <Activity size={18} />
            <span>Monetization Logs</span>
          </h3>
          <p className="text-[10px] text-[#112133]/40 font-mono uppercase tracking-wider mb-4 border-b border-[#112133]/10 pb-3 text-left">
            Realtime affiliate redirection records
          </p>

          {clickLogs.length > 0 ? (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {clickLogs.map((log, i) => (
                <div 
                  key={i} 
                  className="bg-[#FAF9F6] border border-[#112133]/10 p-3 rounded-xl text-left"
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[9px] font-black text-[#00C4CC] uppercase tracking-widest font-grotesk">
                      Redirection Success
                    </span>
                    <span className="text-[8px] font-mono text-[#112133]/40">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <p className="text-[#112133] text-xs font-sans font-bold line-clamp-1">
                    Traced click to {log.retailer.toUpperCase()} Outlet:
                  </p>
                  <p className="text-[9px] text-[#112133]/40 font-mono truncate mt-0.5">
                    ID: {log.productId}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-[#112133]/30 space-y-2 border border-dashed border-[#112133]/10 rounded-xl">
              <Activity className="mx-auto text-[#112133]/20 animate-pulse" size={24} />
              <p className="text-xs font-grotesk text-[#112133]/60">No affiliate tracking loops logged yet.</p>
              <p className="text-[9px] leading-relaxed max-w-[200px] mx-auto text-[#112133]/40">
                Exit links will trace immediately on tapping "Shop Store" buttons.
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-[#112133]/10 text-center">
            <button 
              onClick={() => navigate('search')}
              className="w-full bg-[#7D2AE8] hover:bg-[#6820C4] text-white text-xs font-grotesk font-bold py-3.5 rounded-xl transition uppercase shadow-sm"
            >
              Trigger Sizer Search
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
export default Profile;
