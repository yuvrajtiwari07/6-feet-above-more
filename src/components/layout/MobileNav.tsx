import React from 'react';
import { useApp, RouteType } from '../../context/AppContext';
import { Home, Grid, Sparkles, Heart, User } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { route, navigate, savedProductIds, savedFitIds } = useApp();

  const activeTab = route.current;
  const totalSaved = savedProductIds.length + savedFitIds.length;

  const tabs: { label: string; icon: React.ReactNode; route: RouteType; params?: any; id: string }[] = [
    { label: 'Home', icon: <Home size={20} />, route: 'home', id: 'mob-home' },
    { label: 'Categories', icon: <Grid size={20} />, route: 'category', params: { categoryName: 'Streetwear' }, id: 'mob-categories' },
    { label: 'Catalogs', icon: <Sparkles size={20} />, route: 'catalog-categories', id: 'mob-catalogs' },
    { label: 'Saved', icon: <Heart size={20} />, route: 'saved', id: 'mob-saved' },
    { label: 'Profile', icon: <User size={20} />, route: 'profile', id: 'mob-profile' },
  ];

  const handleTabClick = (t: typeof tabs[0]) => {
    navigate(t.route, t.params);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-45 md:hidden bg-white/95 text-near-black border-t border-near-black/5 backdrop-blur-2xl shadow-xl px-2 pb-safe">
      <div className="flex items-center justify-around py-3">
        {tabs.map((tab) => {
          // Identify if tab is active
          const isCategoryActive = tab.route === 'category' && activeTab === 'category';
          const isCatalogActive = tab.route === 'catalog-categories' && (activeTab === 'catalog-categories' || activeTab === 'catalog-list' || activeTab === 'catalog-detail');
          const isActive = activeTab === tab.route || isCategoryActive || isCatalogActive;

          return (
            <button
              key={tab.label}
              id={tab.id}
              onClick={() => handleTabClick(tab)}
              className="flex flex-col items-center justify-center relative py-1 px-3 grow transition-all "
            >
              <div 
                className={`transition-all duration-350 p-1.5 rounded-full ${
                  isActive 
                    ? 'text-[#7D2AE8] scale-110' 
                    : 'text-[#112133]/60 hover:text-[#112133]'
                }`}
              >
                {tab.icon}
              </div>
              
              <span className={`text-[10px] uppercase font-bold tracking-wider transition-all mt-0.5 ${
                isActive ? 'text-[#7D2AE8] opacity-100 font-extrabold' : 'text-[#112133]/40 opacity-80'
              }`}>
                {tab.label}
              </span>

              {/* Special badge tracker for heart */}
              {tab.label === 'Saved' && totalSaved > 0 && (
                <span className="absolute top-1 right-5 bg-accent-coral text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {totalSaved}
                </span>
              )}

              {/* Active bar overlay */}
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-[#7D2AE8] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
export default MobileNav;
