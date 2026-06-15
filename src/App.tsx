import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/layout/Header';
import MobileNav from './components/layout/MobileNav';

// Views
import Home from './pages/Home';
import Category from './pages/Category';
import ProductDetail from './pages/ProductDetail';
import FitFinder from './pages/FitFinder';
import CompleteFits from './pages/CompleteFits';
import SearchFilters from './pages/SearchFilters';
import Saved from './pages/Saved';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

import { AnimatePresence, motion } from 'motion/react';

const PageRenderer: React.FC = () => {
  const { route } = useApp();

  const renderActiveView = () => {
    switch (route.current) {
      case 'home':
        return <Home />;
      case 'category':
        return <Category />;
      case 'product':
        return <ProductDetail />;
      case 'fit-finder':
        return <FitFinder />;
      case 'complete-fits':
        return <CompleteFits />;
      case 'search':
        return <SearchFilters />;
      case 'saved':
        return <Saved />;
      case 'profile':
        return <Profile />;
      case 'admin':
        return <Admin />;
      default:
        return <Home />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={route.current + (route.params?.categoryName || route.params?.productId || '')}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex-grow w-full"
      >
        {renderActiveView()}
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen flex flex-col bg-off-white selection:bg-lemon selection:text-white text-near-black selection:bg-opacity-95">
        
        {/* Responsive Desktop Top banner / height bar */}
        <Header />

        {/* Dynamic Interactive Page Canvas Switcher */}
        <main className="flex-grow">
          <PageRenderer />
        </main>

        {/* Dynamic responsive mobile bottom dock nav */}
        <MobileNav />

      </div>
    </AppProvider>
  );
}
export { App };
