import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product, FitVerdict, HeightBand, VerdictStatus } from '../types';
import { 
  Plus, Edit2, Check, AlertTriangle, ShieldCheck, Trash2, 
  Eye, Archive, RotateCcw, Link2, MessageSquare, BadgeAlert, 
  Sparkles, CheckCircle, Ruler, CreditCard, ChevronRight, Search, Star
} from 'lucide-react';

export const Admin: React.FC = () => {
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    isAdmin, 
    user, 
    loginWithGoogle 
  } = useApp();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All'); // 'All', 'In Stock', 'Out of Stock'

  // Edited/Added Product form states
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Primary fields
  const [id, setId] = useState('');
  const [brand, setBrand] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Ethnic Wear');
  const [subCategory, setSubCategory] = useState('');
  const [description, setDescription] = useState('');
  const [priceAtRetailer, setPriceAtRetailer] = useState<number>(1999);
  const [retailer, setRetailer] = useState('');
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [fitType, setFitType] = useState('Regular Tall');
  const [verifiedTier, setVerifiedTier] = useState<'verified' | 'friendly' | 'community'>('verified');
  const [outOfStock, setOutOfStock] = useState(false);
  
  // Array/Complex structures (built as comma-separated or dynamic fields)
  const [imagesInput, setImagesInput] = useState('');
  const [occasionsInput, setOccasionsInput] = useState('Casual, Festive');
  const [seasonsInput, setSeasonsInput] = useState('Summer, Winter');
  const [colorsInput, setColorsInput] = useState('Navy, Blue');
  const [sizesInput, setSizesInput] = useState('M, L, XL, XXL, 3XL');
  const [verificationBadgesInput, setVerificationBadgesInput] = useState('Extra Long Torso, Tested on 6\'3"');

  // Measurements
  const [totalLength, setTotalLength] = useState<string>('');
  const [sleeveLength, setSleeveLength] = useState<string>('');
  const [shoulder, setShoulder] = useState<string>('');
  const [chest, setChest] = useState<string>('');
  const [inseam, setInseam] = useState<string>('');
  const [rise, setRise] = useState<string>('');

  // Sizing verdicts for the 4 bands
  const [verdict0_1_Status, setVerdict0_1_Status] = useState<VerdictStatus>('verified');
  const [verdict0_1_Note, setVerdict0_1_Note] = useState('Hits exactly right at waistboro.');
  
  const [verdict2_3_Status, setVerdict2_3_Status] = useState<VerdictStatus>('verified');
  const [verdict2_3_Note, setVerdict2_3_Note] = useState('Tested and perfect for 6\'3" limbs.');

  const [verdict4_5_Status, setVerdict4_5_Status] = useState<VerdictStatus>('friendly');
  const [verdict4_5_Note, setVerdict4_5_Note] = useState('Adequate tuck-in height.');

  const [verdict6_plus_Status, setVerdict6_plus_Status] = useState<VerdictStatus>('community');
  const [verdict6_plus_Note, setVerdict6_plus_Note] = useState('Dignified but may terminate slightly high.');

  // Affiliate Site Outlets List (Can add multiple links: e.g. Amazon, Flipkart, etc.)
  const [merchantLinks, setMerchantLinks] = useState<{ retailer: string; url: string; price: number }[]>([
    { retailer: 'Amazon', url: '', price: 1999 },
    { retailer: 'Flipkart', url: '', price: 1999 }
  ]);

  const [newMerchantRetailer, setNewMerchantRetailer] = useState('');
  const [newMerchantUrl, setNewMerchantUrl] = useState('');
  const [newMerchantPrice, setNewMerchantPrice] = useState<number>(1999);

  // Custom User Reviews List
  const [customReviews, setCustomReviews] = useState<{ author: string; rating: number; text: string; date: string }[]>([
    { author: 'Pranav T.', rating: 5, text: 'Amazing drop. Fits my shoulders perfectly.', date: 'Yesterday' }
  ]);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewText, setNewReviewText] = useState('');

  // Handle adding merchant link to list
  const handleAddMerchantLink = () => {
    if (!newMerchantRetailer || !newMerchantUrl) return;
    setMerchantLinks([...merchantLinks, { 
      retailer: newMerchantRetailer, 
      url: newMerchantUrl, 
      price: newMerchantPrice 
    }]);
    setNewMerchantRetailer('');
    setNewMerchantUrl('');
  };

  // Handle removing merchant link
  const handleRemoveMerchantLink = (idx: number) => {
    setMerchantLinks(merchantLinks.filter((_, i) => i !== idx));
  };

  // Add review to list
  const handleAddReview = () => {
    if (!newReviewAuthor || !newReviewText) return;
    setCustomReviews([...customReviews, {
      author: newReviewAuthor,
      rating: newReviewRating,
      text: newReviewText,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    }]);
    setNewReviewAuthor('');
    setNewReviewText('');
  };

  // Remove review from list
  const handleRemoveReview = (idx: number) => {
    setCustomReviews(customReviews.filter((_, i) => i !== idx));
  };

  // Trigger form opening for adding a brand new product
  const handleOpenAddForm = () => {
    setEditMode(false);
    setShowForm(true);
    setFormError('');
    setFormSuccess('');

    // Reset default inputs
    setId('prod-' + Date.now().toString().slice(-4));
    setBrand('');
    setTitle('');
    setCategory('Ethnic Wear');
    setSubCategory('');
    setDescription('');
    setPriceAtRetailer(1999);
    setRetailer('Ajio');
    setAffiliateUrl('');
    setFitType('Regular Tall');
    setVerifiedTier('verified');
    setOutOfStock(false);
    
    setImagesInput('https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop');
    setOccasionsInput('Casual, Office, Festive');
    setSeasonsInput('Summer, Winter');
    setColorsInput('Blue, Charcoal');
    setSizesInput('M, L, XL, XXL, 3XL');
    setVerificationBadgesInput('Extra Arm Sleeve length, Verified Broad Armhole');

    setTotalLength('82');
    setSleeveLength('71');
    setShoulder('51');
    setChest('114');
    setInseam('');
    setRise('');

    setVerdict0_1_Status('verified');
    setVerdict0_1_Note('Hits elegantly below the hip bone.');
    setVerdict2_3_Status('verified');
    setVerdict2_3_Note('Sleeves stay locked down during full motion.');
    setVerdict4_5_Status('friendly');
    setVerdict4_5_Note('Generous shoulders accommodate high reach.');
    setVerdict6_plus_Status('community');
    setVerdict6_plus_Note('Tail ends might look a tad tailored but fits decently.');

    setMerchantLinks([]);
    setCustomReviews([]);
  };

  // Trigger form opening for editing existing product
  const handleOpenEditForm = (p: Product) => {
    setEditMode(true);
    setShowForm(true);
    setFormError('');
    setFormSuccess('');

    setId(p.id);
    setBrand(p.brand);
    setTitle(p.title);
    setCategory(p.category);
    setSubCategory(p.subCategory || '');
    setDescription(p.description || '');
    setPriceAtRetailer(p.priceAtRetailer);
    setRetailer(p.retailer);
    setAffiliateUrl(p.affiliateUrl);
    setFitType(p.fitType);
    setVerifiedTier(p.verifiedTier);
    setOutOfStock(!!p.outOfStock);
    
    setImagesInput(p.images.join(', '));
    setOccasionsInput(p.occasions.join(', '));
    setSeasonsInput(p.seasons.join(', '));
    setColorsInput(p.colors.join(', '));
    setSizesInput(p.sizes ? p.sizes.join(', ') : 'M, L, XL, XXL, 3XL');
    setVerificationBadgesInput(p.verificationBadges ? p.verificationBadges.join(', ') : 'Verified Arm Length, Broad Chest');

    // Measurements
    setTotalLength(p.measurements?.totalLength?.toString() || '');
    setSleeveLength(p.measurements?.sleeveLength?.toString() || '');
    setShoulder(p.measurements?.shoulder?.toString() || '');
    setChest(p.measurements?.chest?.toString() || '');
    setInseam(p.measurements?.inseam?.toString() || '');
    setRise(p.measurements?.rise?.toString() || '');

    // Verdicts mapping
    const v0_1 = p.verdicts.find(v => v.band === '6_0_6_1');
    if (v0_1) {
      setVerdict0_1_Status(v0_1.status);
      setVerdict0_1_Note(v0_1.note || '');
    }
    const v2_3 = p.verdicts.find(v => v.band === '6_2_6_3');
    if (v2_3) {
      setVerdict2_3_Status(v2_3.status);
      setVerdict2_3_Note(v2_3.note || '');
    }
    const v4_5 = p.verdicts.find(v => v.band === '6_4_6_5');
    if (v4_5) {
      setVerdict4_5_Status(v4_5.status);
      setVerdict4_5_Note(v4_5.note || '');
    }
    const v6_un = p.verdicts.find(v => v.band === '6_6_plus');
    if (v6_un) {
      setVerdict6_plus_Status(v6_un.status);
      setVerdict6_plus_Note(v6_un.note || '');
    }

    setMerchantLinks(p.merchantLinks || []);
    setCustomReviews(p.customReviews || []);
  };

  // Submit product creation or update
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !brand || !title || !category || !priceAtRetailer) {
      setFormError('Please fill out all required attributes: ID, Brand, Title, Category, and Price.');
      return;
    }

    // Parse array variables
    const images = imagesInput.split(',').map(s => s.trim()).filter(Boolean);
    const occasions = occasionsInput.split(',').map(s => s.trim()).filter(Boolean);
    const seasons = seasonsInput.split(',').map(s => s.trim()).filter(Boolean);
    const colors = colorsInput.split(',').map(s => s.trim()).filter(Boolean);
    const sizes = sizesInput.split(',').map(s => s.trim()).filter(Boolean);
    const verificationBadges = verificationBadgesInput.split(',').map(s => s.trim()).filter(Boolean);

    // Build measurements record
    const measurements: any = {};
    if (totalLength) measurements.totalLength = Number(totalLength);
    if (sleeveLength) measurements.sleeveLength = Number(sleeveLength);
    if (shoulder) measurements.shoulder = Number(shoulder);
    if (chest) measurements.chest = Number(chest);
    if (inseam) measurements.inseam = Number(inseam);
    if (rise) measurements.rise = Number(rise);

    // Build the 4 tall fit verdicts
    const verdicts: FitVerdict[] = [
      { band: '6_0_6_1', status: verdict0_1_Status, note: verdict0_1_Note },
      { band: '6_2_6_3', status: verdict2_3_Status, note: verdict2_3_Note },
      { band: '6_4_6_5', status: verdict4_5_Status, note: verdict4_5_Note },
      { band: '6_6_plus', status: verdict6_plus_Status, note: verdict6_plus_Note },
    ];

    const finalProduct: Product = {
      id,
      brand,
      title,
      category,
      subCategory,
      description,
      priceAtRetailer: Number(priceAtRetailer),
      retailer,
      affiliateUrl: affiliateUrl || 'https://lamba.tall.fashion/redirect',
      fitType,
      verifiedTier,
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop'],
      occasions,
      seasons,
      colors,
      sizes,
      verificationBadges,
      measurements,
      verdicts,
      outOfStock,
      merchantLinks,
      customReviews,
      reviewsCount: customReviews.length,
      averageRating: customReviews.length > 0 ? Number((customReviews.reduce((acc, curr) => acc + curr.rating, 0) / customReviews.length).toFixed(1)) : 5
    };

    try {
      if (editMode) {
        await updateProduct(id, finalProduct);
        setFormSuccess('Successfully updated product document ' + id);
      } else {
        await addProduct(finalProduct);
        setFormSuccess('Successfully appended new product ' + id);
      }

      // Hide after a brief timer
      setTimeout(() => {
        setShowForm(false);
        setFormSuccess('');
      }, 1500);

    } catch (err: any) {
      setFormError('Authentication Failure or Firestore Schema block: ' + err.message);
    }
  };

  // Toggle in-stock / out-of-stock instantly from the dashboard
  const handleToggleStock = async (p: Product) => {
    try {
      const nextStockState = !p.outOfStock;
      await updateProduct(p.id, { outOfStock: nextStockState });
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  // Remove product with validation
  const handleDeleteItem = async (p: Product) => {
    if (window.confirm(`Are you absolutely sure you want to delete ${p.title}?`)) {
      try {
        await deleteProduct(p.id);
      } catch (e: any) {
        alert("Error deleting product: " + e.message);
      }
    }
  };

  // Filtering products list
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesStock = stockFilter === 'All' || 
                         (stockFilter === 'In Stock' && !p.outOfStock) ||
                         (stockFilter === 'Out of Stock' && p.outOfStock);

    return matchesSearch && matchesCategory && matchesStock;
  });

  // 1. GUEST WARNING STATUS
  if (!isAdmin) {
    return (
      <div className="min-h-screen py-24 px-4 bg-off-white text-left flex items-center justify-center">
        <div className="max-w-md w-full bg-white border border-[#112133]/15 rounded-3xl p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 bg-[#FF3F6C]/10 rounded-full flex items-center justify-center mx-auto text-[#FF3F6C]">
            <BadgeAlert size={36} />
          </div>
          
          <div className="space-y-2">
            <h1 className="font-display font-black text-3xl uppercase tracking-wider text-[#112133]">
              ADMIN RESTRICTED
            </h1>
            <p className="text-xs text-[#112133]/60 font-sans leading-relaxed">
              This panel controls our secure product directory collections. Unauthorized administrative tampering is disabled.
            </p>
          </div>

          {user ? (
            <div className="p-4 rounded-2xl bg-black/5 text-[#112133] border border-black/5 text-left text-xs space-y-1">
              <div className="font-semibold text-[10px] text-black/50 font-mono uppercase tracking-widest">
                Current Connected User:
              </div>
              <div className="font-grotesk font-black text-black truncate">{user.email}</div>
              <div className="text-[10px] text-[#FF3F6C] font-semibold mt-1">
                ⚠️ Account not whitelisted for write permissions. Must use `ytiwari@argusoft.com` or `yuvrajtiwari0710@gmail.com`.
              </div>
            </div>
          ) : (
            <button
              onClick={() => loginWithGoogle()}
              className="w-full py-4 rounded-xl bg-black hover:bg-[#7D2AE8] text-white text-xs font-grotesk font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2"
              id="admin-sso-login-btn"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.47 1.638l2.45-2.45C17.38 1.63 14.96 1 12.24 1c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.772 0 10.155-4.05 10.155-10 0-.615-.055-1.2-.172-1.715H12.24z"/>
              </svg>
              <span>Verify Administration</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-10 text-[#112133] max-w-7xl mx-auto px-4 md:px-8 text-left">
      
      {/* 2. ADMIN HEADER */}
      <div className="border-b border-[#112133]/15 pb-6 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 bg-[#7D2AE8]/10 text-[#7D2AE8] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-[#7D2AE8]/20">
              <ShieldCheck size={12} />
              <span>Verified System Admin Gate</span>
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black font-display uppercase tracking-tight text-[#112133] leading-none text-left">
            ADMIN LOCKER
          </h1>
          <p className="text-xs text-[#112133]/60 leading-relaxed font-sans mt-2">
            Logged in securely as <span className="font-bold text-[#112133]">{user?.email}</span>. Publish, update catalog details, and flag stock outfalls.
          </p>
        </div>

        <div>
          <button
            onClick={handleOpenAddForm}
            className="flex items-center gap-2 px-5 py-3.5 bg-[#7D2AE8] hover:bg-[#6820C4] text-white rounded-2xl text-xs font-grotesk font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <Plus size={16} />
            <span>Add Brand Product</span>
          </button>
        </div>
      </div>

      {/* 3. CRUD FORM PANEL */}
      {showForm && (
        <div className="bg-white border-2 border-[#7D2AE8]/30 rounded-3xl p-6 md:p-8 mb-10 shadow-md">
          <div className="flex items-center justify-between border-b border-black/10 pb-4 mb-6">
            <h2 className="font-display text-2xl uppercase tracking-wider text-[#7D2AE8] font-bold">
              {editMode ? 'Edit Curated Product' : 'Create New Curved Entry'}
            </h2>
            <button 
              onClick={() => setShowForm(false)}
              className="text-[#112133]/40 hover:text-black font-bold text-xs uppercase font-grotesk px-3 py-1.5 bg-black/5 rounded-xl transition"
            >
              Discard Changes
            </button>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-8">
            {formError && (
              <div className="p-4 bg-[#FF3F6C]/10 text-[#FF3F6C] font-bold text-xs rounded-xl flex items-center gap-2 border border-[#FF3F6C]/20">
                <AlertTriangle size={16} /> <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="p-4 bg-emerald-500/10 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-2 border border-emerald-500/20">
                <CheckCircle size={16} /> <span>{formSuccess}</span>
              </div>
            )}

            {/* Grid 1: Basic Identifiers */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-3">
                <label className="text-[10px] text-black/55 font-black uppercase tracking-wider block mb-1">
                  Unique SKU ID (Alpha-numeric, e.g. prod-1) *
                </label>
                <input 
                  type="text" 
                  value={id}
                  disabled={editMode}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-mono font-bold bg-black/5"
                  required
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-[10px] text-black/55 font-black uppercase tracking-wider block mb-1">
                  Manufacturer / Brand *
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Manyavar, Zara"
                  value={brand} 
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold"
                  required
                />
              </div>

              <div className="md:col-span-6">
                <label className="text-[10px] text-black/55 font-black uppercase tracking-wider block mb-1">
                  Garment Public Title *
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Emerald Green Draped Chikankari Kurta"
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold"
                  required
                />
              </div>
            </div>

            {/* Grid 2: Descriptions and Categories */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-3">
                <label className="text-[10px] text-black/55 font-black uppercase tracking-wider block mb-1">
                  Broad Category *
                </label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold appearance-none bg-white"
                >
                  <option value="Ethnic Wear">Ethnic Wear</option>
                  <option value="Formals">Formals</option>
                  <option value="Streetwear">Streetwear</option>
                  <option value="Casuals">Casuals</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="text-[10px] text-black/55 font-black uppercase tracking-wider block mb-1">
                  Detailed subCategory
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Kurtas, Shirts, Blazers, Hoodies"
                  value={subCategory} 
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-[10px] text-black/55 font-black uppercase tracking-wider block mb-1">
                  Base Catalog Price (INR) *
                </label>
                <input 
                  type="number" 
                  value={priceAtRetailer} 
                  onChange={(e) => setPriceAtRetailer(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold"
                  required
                />
              </div>

              <div className="md:col-span-3 flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={outOfStock} 
                    onChange={(e) => setOutOfStock(e.target.checked)}
                    className="w-4 h-4 text-[#FF3F6C] focus:ring-[#FF3F6C] border-black/20 rounded"
                  />
                  <span className="text-[10px] text-[#FF3F6C] font-black uppercase tracking-wider">
                    Flag Out Of Stock 🔴
                  </span>
                </label>
              </div>
            </div>

            {/* Grid 3: Long description */}
            <div>
              <label className="text-[10px] text-black/55 font-black uppercase tracking-wider block mb-1">
                Editorial Description
              </label>
              <textarea 
                rows={3}
                placeholder="Write long narrative highlighting the tailoring cuts, leg drop sizes, sleeve length, stretch qualities etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-medium font-sans"
              />
            </div>

            {/* Grid 4: Referral affiliate details */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-black/5 p-4 rounded-2xl">
              <div className="md:col-span-4">
                <label className="text-[10px] text-[#7D2AE8] font-black uppercase tracking-wider block mb-1">
                  Primary Partner Retailer name
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Myntra, Tata CLiQ, Ajio"
                  value={retailer} 
                  onChange={(e) => setRetailer(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold bg-white"
                />
              </div>

              <div className="md:col-span-8">
                <label className="text-[10px] text-[#7D2AE8] font-black uppercase tracking-wider block mb-1">
                  Primary Out-Link (Affiliate redirect landing page)
                </label>
                <input 
                  type="text" 
                  placeholder="https://www.retailer.com/out-link"
                  value={affiliateUrl} 
                  onChange={(e) => setAffiliateUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-mono font-medium bg-white"
                />
              </div>
            </div>

            {/* Grid 5: Multi-outlet merchantLinks (Requested: Amazon, Flipkart URLs) */}
            <div className="border border-black/15 p-5 rounded-2xl space-y-4">
              <div>
                <h4 className="font-display text-sm font-black uppercase tracking-wide text-[#7D2AE8]">
                  Direct Site Merchant Outlets list (Multi-Store Links)
                </h4>
                <p className="text-[9px] text-black/50 font-serif leading-relaxed">
                  Provide multiple links to checkout standard listings (e.g. Amazon, Flipkart, Ajio, brand site) as requested for versatile routing.
                </p>
              </div>

              {/* Added listings list */}
              {merchantLinks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {merchantLinks.map((ml, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-black/10">
                      <div className="flex flex-col text-left">
                        <span className="font-black text-[10px] text-black uppercase tracking-wider">{ml.retailer}</span>
                        <span className="text-[9px] text-[#112133]/45 truncate max-w-xs">{ml.url || 'No URL'}</span>
                        <span className="font-mono text-emerald-600 font-extrabold text-[10px]">₹{ml.price}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleRemoveMerchantLink(index)}
                        className="p-1 hover:bg-[#FF3F6C]/10 text-[#FF3F6C] rounded-lg transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Incremental Inline Creator */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-[#FAF9F6] p-3 rounded-xl">
                <div className="sm:col-span-3 text-left">
                  <label className="text-[9px] text-black/50 uppercase font-black tracking-wider block mb-1">Outlet</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Amazon India" 
                    value={newMerchantRetailer}
                    onChange={(e) => setNewMerchantRetailer(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-black/15 text-xs font-bold bg-white"
                  />
                </div>
                <div className="sm:col-span-5 text-left">
                  <label className="text-[9px] text-black/50 uppercase font-black tracking-wider block mb-1">Affiliate URL</label>
                  <input 
                    type="text" 
                    placeholder="https://amazon.in/dp/example" 
                    value={newMerchantUrl}
                    onChange={(e) => setNewMerchantUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-black/15 text-xs font-medium font-mono bg-white"
                  />
                </div>
                <div className="sm:col-span-2 text-left">
                  <label className="text-[9px] text-black/50 uppercase font-black tracking-wider block mb-1">Rupees Price</label>
                  <input 
                    type="number" 
                    value={newMerchantPrice}
                    onChange={(e) => setNewMerchantPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-black/15 text-xs font-bold bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddMerchantLink}
                    className="w-full py-2 bg-[#7D2AE8] hover:bg-[#6820C4] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition"
                  >
                    Add Outlet
                  </button>
                </div>
              </div>
            </div>

            {/* Grid 6: Arrays Configuration (Tags, colors) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] text-black/55 font-black uppercase tracking-wider block mb-1">
                  Product Image URLs (Can take multiple URLs separated by commas)
                </label>
                <input 
                  type="text" 
                  value={imagesInput} 
                  onChange={(e) => setImagesInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-medium font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] text-black/55 font-black uppercase tracking-wider block mb-1">
                  Verification Badges (Custom indicators context, comma-separated)
                </label>
                <input 
                  type="text" 
                  value={verificationBadgesInput} 
                  onChange={(e) => setVerificationBadgesInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold"
                />
              </div>
            </div>

            {/* Grid 7: Detail spec matrices comma-separated */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-4 border border-black/10 rounded-2xl">
              <div>
                <label className="text-[10px] text-black/55 font-black uppercase tracking-wider block mb-1">
                  Occasions (comma-separated)
                </label>
                <input 
                  type="text" 
                  value={occasionsInput} 
                  onChange={(e) => setOccasionsInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-black/15 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-black/55 font-black uppercase tracking-wider block mb-1">
                  Seasons (comma-separated)
                </label>
                <input 
                  type="text" 
                  value={seasonsInput} 
                  onChange={(e) => setSeasonsInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-black/15 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-black/55 font-black uppercase tracking-wider block mb-1">
                  Colors (comma-separated)
                </label>
                <input 
                  type="text" 
                  value={colorsInput} 
                  onChange={(e) => setColorsInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-black/15 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-black/55 font-black uppercase tracking-wider block mb-1">
                  Sizes Available (comma-separated)
                </label>
                <input 
                  type="text" 
                  value={sizesInput} 
                  onChange={(e) => setSizesInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-black/15 text-xs font-bold"
                />
              </div>
            </div>

            {/* Grid 8: Measurements Specs (Important for Tall calibration!) */}
            <div className="border border-[#00C4CC]/30 rounded-2xl p-4">
              <div className="mb-3">
                <span className="font-display font-black uppercase tracking-wider text-xs text-[#00C4CC]">
                  Tailoring Specifications (cm)
                </span>
                <p className="text-[9px] text-[#112133]/55 font-sans">
                  Detail extra-length features such as inseam lengths, total drapes, and extended sleeve alignments.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div>
                  <label className="text-[8px] uppercase tracking-widest text-[#112133]/55 block mb-1">Total Length</label>
                  <input type="number" placeholder="cm" value={totalLength} onChange={(e) => setTotalLength(e.target.value)} className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-bold" />
                </div>
                <div>
                  <label className="text-[8px] uppercase tracking-widest text-[#112133]/55 block mb-1">Sleeve Length</label>
                  <input type="number" placeholder="cm" value={sleeveLength} onChange={(e) => setSleeveLength(e.target.value)} className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-bold" />
                </div>
                <div>
                  <label className="text-[8px] uppercase tracking-widest text-[#112133]/55 block mb-1">Shoulders Width</label>
                  <input type="number" placeholder="cm" value={shoulder} onChange={(e) => setShoulder(e.target.value)} className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-bold" />
                </div>
                <div>
                  <label className="text-[8px] uppercase tracking-widest text-[#112133]/55 block mb-1">Chest Width</label>
                  <input type="number" placeholder="cm" value={chest} onChange={(e) => setChest(e.target.value)} className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-bold" />
                </div>
                <div>
                  <label className="text-[8px] uppercase tracking-widest text-[#112133]/55 block mb-1">Bottom Inseam</label>
                  <input type="number" placeholder="cm" value={inseam} onChange={(e) => setInseam(e.target.value)} className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-bold" />
                </div>
                <div>
                  <label className="text-[8px] uppercase tracking-widest text-[#112133]/55 block mb-1">Trousers Rise</label>
                  <input type="number" placeholder="cm" value={rise} onChange={(e) => setRise(e.target.value)} className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-bold" />
                </div>
              </div>
            </div>

            {/* Grid 9: FIT VERDICTS DIAGNOSIS COHORTS FOR TALL BANDS */}
            <div className="border border-black/15 rounded-2xl p-5 space-y-4 text-left">
              <div>
                <span className="font-display font-black uppercase text-[#7D2AE8] text-sm block">Fit Verdicts & Smart Calibration notes</span>
                <p className="text-[9px] text-[#112133]/55 max-w-xl font-serif">
                  Write verified recommendation status reviews to guide tall buyers on exact shoulder stretches or hem finishes.
                </p>
              </div>

              <div className="space-y-4">
                {/* Band 1 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <span className="font-mono text-xs font-black text-[#112133]">Cohort 6'0" - 6'1":</span>
                  <select 
                    value={verdict0_1_Status} 
                    onChange={(e) => setVerdict0_1_Status(e.target.value as VerdictStatus)}
                    className="px-3 py-2 border border-black/15 rounded-lg text-xs font-bold bg-white"
                  >
                    <option value="verified">Verified Fit ✅</option>
                    <option value="friendly">Tall Friendly 👍</option>
                    <option value="community">Community Reported 👥</option>
                    <option value="runs_short">Runs Short ⚠️</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Calibration note for this segment..." 
                    value={verdict0_1_Note} 
                    onChange={(e) => setVerdict0_1_Note(e.target.value)}
                    className="md:col-span-2 px-3 py-2 border border-black/15 rounded-lg text-xs font-medium"
                  />
                </div>

                {/* Band 2 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <span className="font-mono text-xs font-black text-[#112133]">Cohort 6'2" - 6'3":</span>
                  <select 
                    value={verdict2_3_Status} 
                    onChange={(e) => setVerdict2_3_Status(e.target.value as VerdictStatus)}
                    className="px-3 py-2 border border-black/15 rounded-lg text-xs font-bold bg-white"
                  >
                    <option value="verified">Verified Fit ✅</option>
                    <option value="friendly">Tall Friendly 👍</option>
                    <option value="community">Community Reported 👥</option>
                    <option value="runs_short">Runs Short ⚠️</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Calibration note for this segment..." 
                    value={verdict2_3_Note} 
                    onChange={(e) => setVerdict2_3_Note(e.target.value)}
                    className="md:col-span-2 px-3 py-2 border border-black/15 rounded-lg text-xs font-medium"
                  />
                </div>

                {/* Band 3 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <span className="font-mono text-xs font-black text-[#112133]">Cohort 6'4" - 6'5":</span>
                  <select 
                    value={verdict4_5_Status} 
                    onChange={(e) => setVerdict4_5_Status(e.target.value as VerdictStatus)}
                    className="px-3 py-2 border border-black/15 rounded-lg text-xs font-bold bg-white"
                  >
                    <option value="verified">Verified Fit ✅</option>
                    <option value="friendly">Tall Friendly 👍</option>
                    <option value="community">Community Reported 👥</option>
                    <option value="runs_short">Runs Short ⚠️</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Calibration note for this segment..." 
                    value={verdict4_5_Note} 
                    onChange={(e) => setVerdict4_5_Note(e.target.value)}
                    className="md:col-span-2 px-3 py-2 border border-black/15 rounded-lg text-xs font-medium"
                  />
                </div>

                {/* Band 4 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <span className="font-mono text-xs font-black text-[#112133]">Cohort 6'6"+ Sky:</span>
                  <select 
                    value={verdict6_plus_Status} 
                    onChange={(e) => setVerdict6_plus_Status(e.target.value as VerdictStatus)}
                    className="px-3 py-2 border border-black/15 rounded-lg text-xs font-bold bg-white"
                  >
                    <option value="verified">Verified Fit ✅</option>
                    <option value="friendly">Tall Friendly 👍</option>
                    <option value="community">Community Reported 👥</option>
                    <option value="runs_short">Runs Short ⚠️</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Calibration note..." 
                    value={verdict6_plus_Note} 
                    onChange={(e) => setVerdict6_plus_Note(e.target.value)}
                    className="md:col-span-2 px-3 py-2 border border-black/15 rounded-lg text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Grid 10: CUSTOM REVIEWS (Requested field input support) */}
            <div className="border border-black/15 p-5 rounded-2xl space-y-4">
              <div>
                <h4 className="font-display text-sm font-black uppercase tracking-wide text-[#7D2AE8]">
                  Tall Citizens Community Reviews (Flexible Input)
                </h4>
                <p className="text-[9px] text-black/50 font-serif leading-relaxed">
                  Support review inputs detailing user rating, consumer name, and descriptive fit text.
                </p>
              </div>

              {customReviews.length > 0 && (
                <div className="space-y-2">
                  {customReviews.map((r, i) => (
                    <div key={i} className="bg-neutral-50 p-3.5 rounded-xl border border-black/5 text-xs flex justify-between items-start">
                      <div className="text-left space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-[10px] text-black">{r.author}</span>
                          <span className="flex items-center text-amber-500 font-bold font-mono text-[10px]">
                            <Star size={10} className="fill-current" /> {r.rating}/5
                          </span>
                        </div>
                        <p className="text-[#112133]/80 italic">"{r.text}"</p>
                        <span className="text-[9px] text-[#112133]/40 font-mono">{r.date}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveReview(i)}
                        className="p-1 hover:bg-[#FF3F6C]/10 text-[#FF3F6C] rounded-lg transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-[#FAF9F6] p-3.5 rounded-xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-black/55">Create Community Review:</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input 
                    type="text" 
                    placeholder="Author Name (e.g. Yash S.)" 
                    value={newReviewAuthor}
                    onChange={(e) => setNewReviewAuthor(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-black/15 text-xs font-bold bg-white"
                  />
                  <select 
                    value={newReviewRating}
                    onChange={(e) => setNewReviewRating(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-black/15 text-xs font-bold bg-white"
                  >
                    <option value={5}>5 Stars ⭐⭐⭐⭐⭐</option>
                    <option value={4}>4 Stars ⭐⭐⭐⭐</option>
                    <option value={3}>3 Stars ⭐⭐⭐</option>
                    <option value={2}>2 Stars ⭐⭐</option>
                    <option value={1}>1 Star ⭐</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Fit review, e.g. Extra 2 inches in bottom hem is genius." 
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    className="sm:col-span-2 px-3 py-2 rounded-lg border border-black/15 text-xs font-medium bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddReview}
                  className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition"
                >
                  Append Review Info
                </button>
              </div>
            </div>

            {/* Save Buttons panel */}
            <div className="pt-4 border-t border-black/10 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-6 py-3.5 rounded-xl bg-black/5 hover:bg-black/10 text-xs font-bold uppercase transition"
              >
                Cancel
              </button>
              
              <button 
                type="submit"
                className="px-8 py-3.5 rounded-xl bg-[#7D2AE8] hover:bg-[#6820C4] text-white text-xs font-black uppercase tracking-wider transition"
              >
                {editMode ? 'Publish Amendments' : 'Submit Catalog Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. PRODUCTS INDEX DIRECTORY */}
      <div className="bg-white border border-black/15 rounded-3xl p-6 shadow-sm text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/10 pb-4 mb-6">
          <h3 className="font-display text-xl uppercase tracking-wider font-bold">
            Curated Products ({filteredProducts.length})
          </h3>

          {/* Filtering tools */}
          <div className="flex flex-wrap gap-2.5 items-center">
            {/* Search Input bar */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-[#112133]/45" />
              <input 
                type="text" 
                placeholder="Search SKU, brand or title..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs font-medium pl-8 pr-4 py-2 rounded-xl border border-black/15 bg-neutral-50 focus:ring-1 focus:ring-[#7D2AE8] w-48"
              />
            </div>

            {/* Category selection */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-black/15 bg-white appearance-none pr-8 relative"
            >
              <option value="All">All Categories</option>
              <option value="Ethnic Wear">Ethnic Wear</option>
              <option value="Formals">Formals</option>
              <option value="Streetwear">Streetwear</option>
              <option value="Casuals">Casuals</option>
            </select>

            {/* Stock filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-black/15 bg-white appearance-none pr-8 relative"
            >
              <option value="All">All Stock Levels</option>
              <option value="In Stock">In Stock Only</option>
              <option value="Out of Stock">Out of Stock Only</option>
            </select>
          </div>
        </div>

        {/* Listings elements */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center text-[#112133]/30">
            <Archive size={32} className="mx-auto text-black/15 mb-2" />
            <p className="text-sm font-bold">No catalog matches found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-black/10 text-black/45 uppercase tracking-wider font-mono text-[9px]">
                  <th className="py-3 px-2">SKU ID</th>
                  <th className="py-3 px-2">Item Details</th>
                  <th className="py-3 px-2">Broad Segment</th>
                  <th className="py-3 px-2">Retail Price</th>
                  <th className="py-3 px-2">Multi-Outlets Links</th>
                  <th className="py-3 px-2">Stock Condition</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-sans font-bold">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/50 transition">
                    <td className="py-4 px-2 font-mono text-[10px] text-[#7D2AE8]">
                      {p.id}
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <img 
                          src={p.images[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=100&auto=format&fit=crop'} 
                          alt="preview" 
                          className="w-12 h-12 object-cover rounded-lg border border-black/5 flex-shrink-0" 
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-black leading-tight mb-0.5">{p.title}</span>
                          <span className="text-[10px] text-[#112133]/50 font-black tracking-normal uppercase">{p.brand} ({p.fitType})</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex flex-col">
                        <span className="text-black">{p.category}</span>
                        <span className="text-[10px] text-neutral-400 font-normal">{p.subCategory || 'No segment'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 font-mono text-black font-extrabold">
                      ₹{p.priceAtRetailer}
                    </td>
                    <td className="py-4 px-2 text-left">
                      {p.merchantLinks && p.merchantLinks.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.merchantLinks.map((ml, idx) => (
                            <span 
                              key={idx} 
                              className="text-[8px] uppercase tracking-wider font-extrabold bg-[#00C4CC]/5 text-[#00C4CC] border border-[#00C4CC]/10 px-1.5 py-0.5 rounded"
                              title={ml.url}
                            >
                              {ml.retailer}: ₹{ml.price}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px] text-[#112133]/40 font-normal">Primary only</span>
                      )}
                    </td>
                    <td className="py-4 px-2">
                      {p.outOfStock ? (
                        <span className="inline-flex items-center gap-1 bg-[#FF3F6C]/10 text-[#FF3F6C] px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                          Out Of Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Toggle stock availability instantly */}
                        <button 
                          onClick={() => handleToggleStock(p)}
                          className="px-2.5 py-1.5 rounded-xl border border-black/10 hover:bg-black/5 text-[9px] uppercase font-black tracking-wider transition"
                          title="Instant Stock Toggle"
                        >
                          {p.outOfStock ? 'Mark Available' : 'Mark OOS'}
                        </button>

                        {/* Edit details */}
                        <button 
                          onClick={() => handleOpenEditForm(p)}
                          className="p-2 rounded-xl bg-black/5 hover:bg-black/10 text-[#7D2AE8] transition"
                          title="Edit specs"
                        >
                          <Edit2 size={12} />
                        </button>

                        {/* Delete item */}
                        <button 
                          onClick={() => handleDeleteItem(p)}
                          className="p-2 rounded-xl bg-black/5 hover:bg-[#FF3F6C]/10 text-[#FF3F6C] transition"
                          title="Delete design"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
export default Admin;
