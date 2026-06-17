import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Product, FitVerdict, HeightBand, VerdictStatus } from '../types';
import type { ImportedProduct } from '../lib/importers/types';
import { getAccessToken } from '../supabase';
import { 
  Plus, Edit2, Check, AlertTriangle, ShieldCheck, Trash2, 
  Eye, Archive, RotateCcw, Link2, MessageSquare, BadgeAlert, 
  Sparkles, CheckCircle, Ruler, CreditCard, ChevronRight, Search, Star,
  Download, Loader2, Globe, X, Upload, ArrowUp, ArrowDown
} from 'lucide-react';

const SEGMENT_TYPES: Record<string, string[]> = {
  Upperwear: ['T-Shirt', 'Shirt', 'Polo', 'Henley', 'Vest', 'Tank Top'],
  Bottomwear: ['Jeans', 'Cargo Pants', 'Trousers', 'Joggers', 'Chinos', 'Shorts'],
  Footwear: ['Sneakers', 'Boots', 'Formal Shoes', 'Loafers', 'Running Shoes'],
  Outerwear: ['Hoodie', 'Sweatshirt', 'Jacket', 'Overshirt'],
  'Ethnic Wear': ['Kurta', 'Kurta Set', 'Nehru Jacket'],
  Accessories: ['Belt', 'Cap', 'Wallet', 'Socks'],
};

const getSizeOptions = (segment: string): string[] => {
  if (segment === 'Footwear') {
    return ['UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12', 'UK 13', 'UK 14'];
  }
  if (segment === 'Bottomwear') {
    return ['30', '32', '34', '36', '38', '40', '42'];
  }
  return ['M', 'L', 'XL', 'XXL', '3XL', '4XL'];
};

const BROAD_CATEGORIES = [
  'Casual Wear', 'Formal Wear', 'Athleisure', 'Streetwear', 
  'Business Casual', 'Ethnic Wear', 'Winter Wear', 'Summer Wear', 
  'Travel Wear', 'Gym Wear', 'Outdoor Wear'
];

const OCCASIONS = [
  'Daily Wear', 'Office', 'Gym', 'Travel', 'Date Night', 'Party', 
  'Wedding', 'Festive', 'Outdoor', 'Business Casual', 'Work From Home', 'Vacation'
];

const SEASONS = ['Summer', 'Winter', 'Monsoon', 'Spring', 'Autumn', 'All Season'];

const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF', border: true },
  { name: 'Grey', hex: '#808080' },
  { name: 'Navy', hex: '#000080' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'Brown', hex: '#A52A2A' },
  { name: 'Olive', hex: '#808000' },
  { name: 'Beige', hex: '#F5F5DC', border: true },
  { name: 'Khaki', hex: '#F0E68C' },
  { name: 'Green', hex: '#008000' },
  { name: 'Red', hex: '#FF0000' }
];

const HEIGHT_RANGES = ["6'0–6'2", "6'2–6'4", "6'4–6'6", "6'6+"];
const BODY_TYPES = ['Slim', 'Athletic', 'Broad', 'Heavy Build'];
const FIT_HIGHLIGHTS = [
  'Long Sleeves', 'Long Inseam', 'Broad Shoulder Friendly', 
  'Extended Torso Fit', 'Extra Leg Room', 'Long Rise'
];

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
  const [stockFilter, setStockFilter] = useState('All');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Import from URL states
  const [importUrl, setImportUrl] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [detectedRetailer, setDetectedRetailer] = useState('');

  // Primary fields
  const [id, setId] = useState('');
  const [brand, setBrand] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceAtRetailer, setPriceAtRetailer] = useState<number>(1999);
  const [retailer, setRetailer] = useState('');
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [fitType, setFitType] = useState('Regular Tall');
  const [verifiedTier, setVerifiedTier] = useState<'verified' | 'friendly' | 'community'>('verified');
  const [outOfStock, setOutOfStock] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<string>('0');

  // Classification & Taxonomy
  const [productSegment, setProductSegment] = useState('Upperwear');
  const [productType, setProductType] = useState('T-Shirt');
  const [categories, setCategories] = useState<string[]>(['Casual Wear']);
  const [occasions, setOccasions] = useState<string[]>(['Daily Wear']);
  const [seasons, setSeasons] = useState<string[]>(['All Season']);
  const [colors, setColors] = useState<string[]>(['Black']);
  const [tags, setTags] = useState<string[]>(['tall-friendly']);
  const [newTagInput, setNewTagInput] = useState('');
  const [material, setMaterial] = useState('');

  // Image Management
  const [imageSource, setImageSource] = useState<'imported' | 'upload'>('imported');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Tall Fit Curation (Hero Section)
  const [tallFriendly, setTallFriendly] = useState(true);
  const [selectedHeightRanges, setSelectedHeightRanges] = useState<string[]>(["6'2–6'4"]);
  const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>(['Athletic']);
  const [selectedFitHighlights, setSelectedFitHighlights] = useState<string[]>(['Extended Torso Fit']);
  const [sizes, setSizes] = useState<string[]>(['L', 'XL', 'XXL']);

  // Verdicts (kept for compatibility, generated based on selection or simple inputs)
  const [verdict0_1_Note, setVerdict0_1_Note] = useState('Hits exactly right at waistline.');
  const [verdict2_3_Note, setVerdict2_3_Note] = useState('Tested and perfect for 6\'3" limbs.');
  const [verdict4_5_Note, setVerdict4_5_Note] = useState('Adequate tuck-in height.');
  const [verdict6_plus_Note, setVerdict6_plus_Note] = useState('Dignified but may terminate slightly high.');

  // Affiliate Outlets
  const [merchantLinks, setMerchantLinks] = useState<{ store: string; url: string; price: number }[]>([]);

  // Toggle helpers for multi-select chips/checkboxes
  const toggleSelection = (item: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Image management helpers
  const handleAddImageUrl = () => {
    if (imageUrlInput.trim() && !images.includes(imageUrlInput.trim())) {
      setImages([...images, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleMarkPrimaryImage = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const [selected] = newImages.splice(index, 1);
    newImages.unshift(selected);
    setImages(newImages);
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === images.length - 1) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    const newImages = [...images];
    const temp = newImages[index];
    newImages[index] = newImages[nextIndex];
    newImages[nextIndex] = temp;
    setImages(newImages);
  };

  const handleDeviceUploadSimulated = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const localUrl = URL.createObjectURL(file);
        // In real app, upload to Supabase Storage, here we use ObjectURL for preview
        setImages(prev => [...prev, localUrl]);
      }
    }
  };

  // Tag helpers
  const handleAddTag = () => {
    const cleaned = newTagInput.trim().toLowerCase();
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // Apply imported data
  const applyImportedProduct = useCallback((data: ImportedProduct) => {
    if (data.brand) setBrand(data.brand);
    if (data.title) setTitle(data.title);
    if (data.description) setDescription(data.description);
    if (data.price) setPriceAtRetailer(data.price);
    if (data.discountPercent !== undefined) setDiscountPercent(String(data.discountPercent));
    if (data.retailer) setRetailer(data.retailer);
    if (data.retailerUrl) setAffiliateUrl(data.retailerUrl);
    if (data.images && data.images.length > 0) setImages(data.images);
    if (data.colors && data.colors.length > 0) setColors(data.colors);
    if (data.material) setMaterial(data.material);

    // AI Classification Simulation
    const combinedText = `${data.title || ''} ${data.category || ''} ${data.subCategory || ''}`.toLowerCase();
    let detectedSegment = 'Upperwear';
    let detectedType = 'T-Shirt';

    if (combinedText.match(/jeans|trouser|pant|cargo|chino|shorts/)) {
      detectedSegment = 'Bottomwear';
      detectedType = combinedText.includes('jeans') ? 'Jeans'
        : combinedText.includes('cargo') ? 'Cargo Pants'
        : combinedText.includes('jogger') ? 'Joggers'
        : combinedText.includes('chino') ? 'Chinos'
        : combinedText.includes('shorts') ? 'Shorts'
        : 'Trousers';
    } else if (combinedText.match(/shoe|sneaker|boot|loafer/)) {
      detectedSegment = 'Footwear';
      detectedType = combinedText.includes('sneaker') ? 'Sneakers'
        : combinedText.includes('boot') ? 'Boots'
        : combinedText.includes('loafer') ? 'Loafers'
        : 'Formal Shoes';
    } else if (combinedText.match(/hoodie|sweatshirt|jacket|overshirt/)) {
      detectedSegment = 'Outerwear';
      detectedType = combinedText.includes('hoodie') ? 'Hoodie'
        : combinedText.includes('sweatshirt') ? 'Sweatshirt'
        : combinedText.includes('overshirt') ? 'Overshirt'
        : 'Jacket';
    } else if (combinedText.match(/kurta|nehru/)) {
      detectedSegment = 'Ethnic Wear';
      detectedType = combinedText.includes('set') ? 'Kurta Set'
        : combinedText.includes('nehru') ? 'Nehru Jacket'
        : 'Kurta';
    } else if (combinedText.match(/belt|cap|wallet|socks/)) {
      detectedSegment = 'Accessories';
      detectedType = combinedText.includes('belt') ? 'Belt'
        : combinedText.includes('cap') ? 'Cap'
        : combinedText.includes('wallet') ? 'Wallet'
        : 'Socks';
    } else {
      detectedType = combinedText.includes('shirt') ? 'Shirt'
        : combinedText.includes('polo') ? 'Polo'
        : combinedText.includes('henley') ? 'Henley'
        : 'T-Shirt';
    }

    setProductSegment(detectedSegment);
    setProductType(detectedType);

    // Categories array AI suggestion
    const suggestedCats: string[] = [];
    if (detectedSegment === 'Ethnic Wear') suggestedCats.push('Ethnic Wear');
    if (detectedSegment === 'Footwear') suggestedCats.push('Casual Wear');
    if (combinedText.match(/formal|office|business/)) suggestedCats.push('Formal Wear', 'Business Casual');
    if (combinedText.match(/gym|active|sport|run/)) suggestedCats.push('Athleisure', 'Gym Wear');
    if (combinedText.match(/street|hype|cargo/)) suggestedCats.push('Streetwear', 'Casual Wear');
    if (suggestedCats.length === 0) suggestedCats.push('Casual Wear');
    setCategories(suggestedCats);

    // Occasions AI suggestion
    const suggestedOccs: string[] = ['Daily Wear'];
    if (combinedText.match(/office|work|business/)) suggestedOccs.push('Office', 'Business Casual');
    if (combinedText.match(/party|club/)) suggestedOccs.push('Party');
    if (combinedText.match(/wedding|festive|marry/)) suggestedOccs.push('Wedding', 'Festive');
    if (combinedText.match(/travel|trip|vacation/)) suggestedOccs.push('Travel', 'Vacation');
    setOccasions(suggestedOccs);

    // Seasons suggestion
    setSeasons(combinedText.match(/winter|jacket|wool|hood/ ) ? ['Winter'] : ['All Season']);

    // Height & Body suggestions for tall-fit curation
    if (detectedSegment === 'Upperwear' || detectedSegment === 'Outerwear') {
      setSelectedFitHighlights(['Long Sleeves', 'Extended Torso Fit']);
    } else if (detectedSegment === 'Bottomwear') {
      setSelectedFitHighlights(['Long Inseam', 'Long Rise']);
    } else {
      setSelectedFitHighlights(['Extra Leg Room']);
    }

    // Default height ranges
    setSelectedHeightRanges(["6'2–6'4", "6'4–6'6"]);
    setSelectedBodyTypes(['Slim', 'Athletic']);

    // Populate sizes
    if (data.sizes && data.sizes.length > 0) {
      setSizes(data.sizes.map(s => s.trim()));
    } else {
      setSizes(getSizeOptions(detectedSegment).slice(1, 5));
    }

    // Tags list
    const suggestedTags = ['tall-friendly', detectedSegment.toLowerCase(), detectedType.toLowerCase()];
    if (data.brand) suggestedTags.push(data.brand.toLowerCase());
    setTags(suggestedTags);

    if (data.title && !id.startsWith('prod-')) {
      const slugId = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      setId(slugId);
    }
  }, [id]);

  const applyCuratedUrlResponse = useCallback((data: any) => {
    setBrand(data.brand || '');
    setTitle(data.title || '');
    setMaterial(data.material || '');
    setRetailer(data.retailer || '');
    setPriceAtRetailer(data.price || 0);
    setImages(data.images || []);
    setAffiliateUrl(importUrl.trim());

    // Broad Category mapping
    const selectedCats: string[] = [];
    if (data.category === 'Ethnic Wear') {
      selectedCats.push('Ethnic Wear');
    } else if (data.category === 'Formals') {
      selectedCats.push('Formal Wear', 'Business Casual');
    } else if (data.category === 'Streetwear') {
      selectedCats.push('Streetwear', 'Casual Wear');
    } else if (data.category === 'Casuals') {
      selectedCats.push('Casual Wear');
    }
    setCategories(selectedCats.length > 0 ? selectedCats : ['Casual Wear']);

    // Occasions mapping
    if (data.occasions && Array.isArray(data.occasions)) {
      const matchedOccs = data.occasions
        .map((o: string) => {
          const matched = OCCASIONS.find(opt => opt.toLowerCase().includes(o.toLowerCase()));
          return matched || null;
        })
        .filter(Boolean) as string[];
      setOccasions(matchedOccs.length > 0 ? matchedOccs : ['Daily Wear']);
    } else {
      setOccasions(['Daily Wear']);
    }

    // Seasons mapping
    if (data.seasons && Array.isArray(data.seasons)) {
      const matchedSeas = data.seasons
        .map((s: string) => {
          const matched = SEASONS.find(opt => opt.toLowerCase().includes(s.toLowerCase()));
          return matched || null;
        })
        .filter(Boolean) as string[];
      setSeasons(matchedSeas.length > 0 ? matchedSeas : ['All Season']);
    }

    // Colors mapping
    if (data.colors && Array.isArray(data.colors)) {
      const matchedColors = data.colors
        .map((c: string) => {
          if (!c) return null;
          const clean = c.trim();
          const matched = COLORS.find(opt => 
            opt.name.toLowerCase() === clean.toLowerCase() || 
            opt.name.toLowerCase().includes(clean.toLowerCase()) ||
            clean.toLowerCase().includes(opt.name.toLowerCase())
          );
          if (matched) return matched.name;
          return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        })
        .filter(Boolean) as string[];
      setColors(matchedColors.length > 0 ? matchedColors : []);
    } else {
      setColors([]);
    }

    // subCategory & segments detection
    if (data.subCategory) {
      const combinedText = `${data.title || ''} ${data.category || ''} ${data.subCategory || ''}`.toLowerCase();
      let detectedSegment = 'Upperwear';
      let detectedType = 'T-Shirt';

      if (combinedText.match(/jeans|trouser|pant|cargo|chino|shorts/)) {
        detectedSegment = 'Bottomwear';
        detectedType = combinedText.includes('jeans') ? 'Jeans'
          : combinedText.includes('cargo') ? 'Cargo Pants'
          : combinedText.includes('jogger') ? 'Joggers'
          : combinedText.includes('chino') ? 'Chinos'
          : combinedText.includes('shorts') ? 'Shorts'
          : 'Trousers';
      } else if (combinedText.match(/shoe|sneaker|boot|loafer/)) {
        detectedSegment = 'Footwear';
        detectedType = combinedText.includes('sneaker') ? 'Sneakers'
          : combinedText.includes('boot') ? 'Boots'
          : combinedText.includes('loafer') ? 'Loafers'
          : 'Formal Shoes';
      } else if (combinedText.match(/hoodie|sweatshirt|jacket|overshirt/)) {
        detectedSegment = 'Outerwear';
        detectedType = combinedText.includes('hoodie') ? 'Hoodie'
          : combinedText.includes('sweatshirt') ? 'Sweatshirt'
          : combinedText.includes('overshirt') ? 'Overshirt'
          : 'Jacket';
      } else if (combinedText.match(/kurta|nehru/)) {
        detectedSegment = 'Ethnic Wear';
        detectedType = combinedText.includes('set') ? 'Kurta Set'
          : combinedText.includes('nehru') ? 'Nehru Jacket'
          : 'Kurta';
      } else if (combinedText.match(/belt|cap|wallet|socks/)) {
        detectedSegment = 'Accessories';
        detectedType = combinedText.includes('belt') ? 'Belt'
          : combinedText.includes('cap') ? 'Cap'
          : combinedText.includes('wallet') ? 'Wallet'
          : 'Socks';
      } else {
        detectedType = combinedText.includes('shirt') ? 'Shirt'
          : combinedText.includes('polo') ? 'Polo'
          : combinedText.includes('henley') ? 'Henley'
          : 'T-Shirt';
      }

      setProductSegment(detectedSegment);
      setProductType(detectedType);
      setSizes(getSizeOptions(detectedSegment).slice(1, 5));
    }

    // Tall Curation centerpiece parameters
    if (data.tallFit) {
      if (data.tallFit.tallFriendly !== undefined) {
        setTallFriendly(!!data.tallFit.tallFriendly);
      }
      
      // Height Ranges
      if (data.tallFit.recommendedHeightRanges && Array.isArray(data.tallFit.recommendedHeightRanges)) {
        const matchedHeights = data.tallFit.recommendedHeightRanges
          .map((h: string) => {
            if (h.includes('6\'0') || h.includes('6\'1') || h.includes('6.0') || h.includes('6.1')) return "6'0–6'2";
            if (h.includes('6\'2') || h.includes('6\'3') || h.includes('6.2') || h.includes('6.3')) return "6'2–6'4";
            if (h.includes('6\'4') || h.includes('6\'5') || h.includes('6.4') || h.includes('6.5')) return "6'4–6'6";
            if (h.includes('6\'6') || h.includes('6.6') || h.includes('+')) return "6'6+";
            return null;
          })
          .filter(Boolean) as string[];
        if (matchedHeights.length > 0) {
          setSelectedHeightRanges([...new Set(matchedHeights)]);
        }
      }

      // Body Types
      if (data.tallFit.bodyTypes && Array.isArray(data.tallFit.bodyTypes)) {
        const matchedBody = data.tallFit.bodyTypes
          .map((b: string) => {
            if (b.toLowerCase().includes('slim')) return 'Slim';
            if (b.toLowerCase().includes('athletic')) return 'Athletic';
            if (b.toLowerCase().includes('broad')) return 'Broad';
            if (b.toLowerCase().includes('heavy')) return 'Heavy Build';
            return null;
          })
          .filter(Boolean) as string[];
        if (matchedBody.length > 0) {
          setSelectedBodyTypes([...new Set(matchedBody)]);
        }
      }

      // Tall Fit Highlights
      if (data.tallFit.highlights && Array.isArray(data.tallFit.highlights)) {
        const matchedHighlights = data.tallFit.highlights
          .map((hl: string) => {
            const lower = hl.toLowerCase();
            if (lower.includes('sleeve')) return 'Long Sleeves';
            if (lower.includes('inseam')) return 'Long Inseam';
            if (lower.includes('shoulder')) return 'Broad Shoulder Friendly';
            if (lower.includes('torso') || lower.includes('length')) return 'Extended Torso Fit';
            if (lower.includes('leg') || lower.includes('room')) return 'Extra Leg Room';
            if (lower.includes('rise')) return 'Long Rise';
            return null;
          })
          .filter(Boolean) as string[];
        if (matchedHighlights.length > 0) {
          setSelectedFitHighlights([...new Set(matchedHighlights)]);
        }
      }
    }

    // Images
    if (data.images && data.images.length > 0) {
      setImages(data.images);
    }

    // Slug / ID generation
    if (data.title && !id.startsWith('prod-')) {
      const slugId = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      setId(slugId);
    }

    // Tags list
    const suggestedTags = ['tall-friendly', (data.brand || 'brand').toLowerCase()];
    if (data.tags && Array.isArray(data.tags)) {
      setTags([...new Set([...suggestedTags, ...data.tags.map(t => t.toLowerCase())])]);
    } else {
      setTags(suggestedTags);
    }
  }, [id, importUrl]);

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) return;
    setImportStatus('loading');
    setImportMessage('Curating Attributes...');
    setDetectedRetailer('');

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/curate/import-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ url: importUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Gemini import failed');
      }

      setDetectedRetailer(data.retailer ?? '');
      applyCuratedUrlResponse(data);
      setImportStatus('success');
      setImportMessage(`Imported and Curated via ${data.source || 'AI'}! Review all settings before creating.`);

      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage('');
      }, 8000);
    } catch (err: any) {
      console.warn('Gemini curation failed. Switching to standard parser...', err.message);
      setImportMessage('Gemini failed. Switching to standard parser...');

      // Fallback to old importer
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/admin/import-product', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ url: importUrl.trim() }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error ?? 'Fallback import failed');
        }

        setDetectedRetailer(data.retailerName ?? '');
        applyImportedProduct(data.product);
        setImportStatus('success');
        setImportMessage('Imported successfully using standard parser. Review tall curation settings.');

        setTimeout(() => {
          setImportStatus('idle');
          setImportMessage('');
        }, 6000);
      } catch (fallbackErr: any) {
        setImportStatus('error');
        setImportMessage(fallbackErr.message ?? 'Unable to import product data. Try another URL.');
      }
    }
  };

  const handleOpenAddForm = () => {
    setEditMode(false);
    setShowForm(true);
    setFormError('');
    setFormSuccess('');

    // Reset default inputs
    setId('prod-' + Date.now().toString().slice(-4));
    setBrand('');
    setTitle('');
    setDescription('');
    setPriceAtRetailer(1999);
    setRetailer('Ajio');
    setAffiliateUrl('');
    setFitType('Regular Tall');
    setVerifiedTier('verified');
    setOutOfStock(false);
    setIsFeatured(false);
    setDiscountPercent('0');
    setProductSegment('Upperwear');
    setProductType('T-Shirt');
    setCategories(['Casual Wear']);
    setOccasions(['Daily Wear']);
    setSeasons(['All Season']);
    setColors(['Black']);
    setTags(['tall-friendly']);
    setMaterial('');
    setImages([]);
    setTallFriendly(true);
    setSelectedHeightRanges(["6'2–6'4"]);
    setSelectedBodyTypes(['Athletic']);
    setSelectedFitHighlights(['Extended Torso Fit']);
    setSizes(['L', 'XL', 'XXL']);
    setVerdict0_1_Note('Hits exactly right at waistline.');
    setVerdict2_3_Note('Tested and perfect for 6\'3" limbs.');
    setVerdict4_5_Note('Adequate tuck-in height.');
    setVerdict6_plus_Note('Dignified but may terminate slightly high.');
    setMerchantLinks([]);
  };

  const handleOpenEditForm = (p: Product) => {
    setEditMode(true);
    setShowForm(true);
    setFormError('');
    setFormSuccess('');

    setId(p.id);
    setBrand(p.brand);
    setTitle(p.title);
    setDescription(p.description || '');
    setPriceAtRetailer(p.priceAtRetailer);
    setRetailer(p.retailer);
    setAffiliateUrl(p.affiliateUrl);
    setFitType(p.fitType);
    setVerifiedTier(p.verifiedTier);
    setOutOfStock(!!p.outOfStock);
    setIsFeatured(!!p.isFeatured);
    setDiscountPercent(p.discountPercent?.toString() || '0');
    setProductSegment(p.productSegment || 'Upperwear');
    setProductType(p.productType || 'T-Shirt');
    
    // Taxonomy values arrays
    setCategories(p.categories || [p.category]);
    setOccasions(p.occasions || []);
    setSeasons(p.seasons || []);
    setColors(p.colors || []);
    setTags(p.tags || []);
    setMaterial(p.material || '');
    setImages(p.images || []);

    // Curation tall fields
    setTallFriendly(p.tallFriendly !== false);
    setSelectedHeightRanges(p.heightRanges || ["6'2–6'4"]);
    setSelectedBodyTypes(p.bodyTypes || ['Athletic']);
    setSelectedFitHighlights(p.fitHighlights || []);
    setSizes(p.sizes || []);

    // Verdict notes load
    const v0_1 = p.verdicts.find(v => v.band === '6_0_6_1');
    if (v0_1) setVerdict0_1_Note(v0_1.note || '');
    const v2_3 = p.verdicts.find(v => v.band === '6_2_6_3');
    if (v2_3) setVerdict2_3_Note(v2_3.note || '');
    const v4_5 = p.verdicts.find(v => v.band === '6_4_6_5');
    if (v4_5) setVerdict4_5_Note(v4_5.note || '');
    const v6_un = p.verdicts.find(v => v.band === '6_6_plus');
    if (v6_un) setVerdict6_plus_Note(v6_un.note || '');

    setMerchantLinks(p.merchantLinks || []);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !brand || !title || !priceAtRetailer) {
      setFormError('Please fill out all required fields: ID, Brand, Title, and Price.');
      return;
    }

    const verdicts: FitVerdict[] = [
      { band: '6_0_6_1', status: selectedHeightRanges.includes("6'0–6'2") ? 'friendly' : 'community', note: verdict0_1_Note },
      { band: '6_2_6_3', status: selectedHeightRanges.includes("6'2–6'4") ? 'verified' : 'friendly', note: verdict2_3_Note },
      { band: '6_4_6_5', status: selectedHeightRanges.includes("6'4–6'6") ? 'verified' : 'friendly', note: verdict4_5_Note },
      { band: '6_6_plus', status: selectedHeightRanges.includes("6'6+") ? 'friendly' : 'runs_short', note: verdict6_plus_Note },
    ];

    const finalProduct: Product = {
      id,
      brand,
      title,
      category: categories[0] || 'Casual Wear',
      categories,
      productSegment,
      productType,
      description,
      priceAtRetailer: Number(priceAtRetailer),
      retailer,
      affiliateUrl: affiliateUrl || 'https://6feetabove.com/redirect',
      fitType,
      verifiedTier,
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop'],
      occasions,
      seasons,
      colors,
      sizes,
      verdicts,
      outOfStock,
      merchantLinks,
      material,
      tags,
      discountPercent: Number(discountPercent) || 0,
      isFeatured,
      tallFriendly,
      heightRanges: selectedHeightRanges,
      bodyTypes: selectedBodyTypes,
      fitHighlights: selectedFitHighlights,
    };

    try {
      if (editMode) {
        await updateProduct(id, finalProduct);
        setFormSuccess('Successfully updated product!');
      } else {
        await addProduct(finalProduct);
        setFormSuccess('Successfully created product!');
      }
      setTimeout(() => {
        setShowForm(false);
        setFormSuccess('');
      }, 1500);
    } catch (err: any) {
      setFormError('Save failed: ' + (err.message || 'Unknown error.'));
    }
  };

  const handleToggleStock = async (p: Product) => {
    try {
      await updateProduct(p.id, { outOfStock: !p.outOfStock });
    } catch (e: any) {
      alert("Error updating stock: " + e.message);
    }
  };

  const handleDeleteItem = async (p: Product) => {
    if (window.confirm(`Are you absolutely sure you want to delete ${p.title}?`)) {
      try {
        await deleteProduct(p.id);
      } catch (e: any) {
        alert("Error deleting product: " + e.message);
      }
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter || (p.categories && p.categories.includes(categoryFilter));
    const matchesStock = stockFilter === 'All' || 
                         (stockFilter === 'In Stock' && !p.outOfStock) ||
                         (stockFilter === 'Out of Stock' && p.outOfStock);
    return matchesSearch && matchesCategory && matchesStock;
  });

  const hasAccess = isAdmin || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

  if (!hasAccess) {
    return (
      <div className="min-h-screen py-24 px-4 bg-off-white flex items-center justify-center">
        <div className="max-w-md w-full bg-white border border-[#112133]/15 rounded-3xl p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 bg-[#FF3F6C]/10 rounded-full flex items-center justify-center mx-auto text-[#FF3F6C]">
            <BadgeAlert size={36} />
          </div>
          <h2 className="text-[#112133] font-display text-2xl uppercase tracking-wider">Restricted Entry</h2>
          <p className="text-[#112133]/60 text-xs leading-relaxed">
            Admin validation required to alter catalogs. Login via Google to authenticate.
          </p>
          <button 
            onClick={loginWithGoogle}
            className="w-full py-4 bg-[#7D2AE8] text-white rounded-xl text-xs font-grotesk font-black uppercase tracking-wider hover:bg-[#6820C4]"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-10 text-[#112133] max-w-7xl mx-auto px-4 md:px-8 text-left">
      
      {/* HEADER */}
      <div className="border-b border-[#112133]/15 pb-6 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 bg-[#7D2AE8]/10 text-[#7D2AE8] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-[#7D2AE8]/20">
              <ShieldCheck size={12} />
              <span>Verified System Admin Gate</span>
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black font-display uppercase tracking-tight text-[#112133] leading-none">
            ADMIN LOCKER
          </h1>
          <p className="text-xs text-[#112133]/60 leading-relaxed mt-2 font-sans">
            Logged in securely as <span className="font-bold text-[#112133]">{user?.email}</span>. Publish and curate products efficiently.
          </p>
        </div>

        <div>
          <button
            onClick={handleOpenAddForm}
            className="flex items-center gap-2 px-5 py-3.5 bg-[#7D2AE8] hover:bg-[#6820C4] text-white rounded-2xl text-xs font-grotesk font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <Plus size={16} />
            <span>Add Curated Product</span>
          </button>
        </div>
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div className="bg-white border-2 border-[#7D2AE8]/30 rounded-3xl p-6 md:p-8 mb-10 shadow-md">
          <div className="flex items-center justify-between border-b border-black/10 pb-4 mb-6">
            <h2 className="font-display text-2xl uppercase tracking-wider text-[#7D2AE8] font-bold">
              {editMode ? 'Edit Curated Product' : 'Create New Curated Product'}
            </h2>
            <button 
              onClick={() => setShowForm(false)}
              className="text-[#112133]/40 hover:text-black font-bold text-xs uppercase font-grotesk px-3 py-1.5 bg-black/5 rounded-xl transition"
            >
              Discard
            </button>
          </div>

          {/* URL IMPORT IS PRIMARY */}
          {!editMode && (
            <div className="mb-8 border-2 border-dashed border-[#7D2AE8]/30 rounded-2xl p-5 bg-gradient-to-br from-[#7D2AE8]/3 to-transparent">
              <div className="flex items-center gap-2 mb-3">
                <Download size={16} className="text-[#7D2AE8]" />
                <span className="font-display font-black uppercase text-sm tracking-wider text-[#7D2AE8]">
                  Import Product From URL
                </span>
                <span className="text-[9px] bg-[#7D2AE8]/10 text-[#7D2AE8] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                  Auto-fills Form in Seconds
                </span>
              </div>
              <p className="text-[10px] text-black/45 mb-4 font-sans">
                Paste product URL from Myntra, AJIO, Amazon, Flipkart, H&amp;M, Zara, Snitch, Rare Rabbit, Urbanic, Bewakoof etc.
              </p>

              <div className="flex gap-3 items-stretch">
                <div className="relative flex-1">
                  <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                  <input
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://www.myntra.com/shirts/brand/product-id"
                    disabled={importStatus === 'loading'}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-mono disabled:opacity-60"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleImportFromUrl}
                  disabled={importStatus === 'loading' || !importUrl.trim()}
                  className="flex items-center gap-2 px-5 py-3 bg-[#7D2AE8] hover:bg-[#6820C4] disabled:opacity-50 text-white rounded-xl text-xs font-grotesk font-black uppercase tracking-wider transition-all shrink-0"
                >
                  {importStatus === 'loading' ? (
                    <><Loader2 size={14} className="animate-spin" /> Importing...</>
                  ) : (
                    <><Download size={14} /> Import</>
                  )}
                </button>
              </div>

              {detectedRetailer && importStatus !== 'error' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] text-black/40 font-sans">Detected Retailer:</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                    ✓ {detectedRetailer}
                  </span>
                </div>
              )}

              {importMessage && (
                <div className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                  importStatus === 'success' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-[#FF3F6C]/10 text-[#FF3F6C] border-[#FF3F6C]/20'
                }`}>
                  {importStatus === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  {importMessage}
                </div>
              )}
            </div>
          )}

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

            {/* SEGMENT & TYPE SELECTORS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#FAF9F6] p-5 rounded-2xl border border-black/5">
              <div>
                <label className="text-[10px] text-[#7D2AE8] font-black uppercase tracking-wider block mb-1.5">
                  Product Segment *
                </label>
                <select
                  value={productSegment}
                  onChange={(e) => {
                    const nextSegment = e.target.value;
                    setProductSegment(nextSegment);
                    const types = SEGMENT_TYPES[nextSegment] || [];
                    if (types.length > 0) setProductType(types[0]);
                    setSizes(getSizeOptions(nextSegment).slice(1, 5));
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold bg-white"
                >
                  <option value="Upperwear">Upperwear</option>
                  <option value="Bottomwear">Bottomwear</option>
                  <option value="Footwear">Footwear</option>
                  <option value="Outerwear">Outerwear</option>
                  <option value="Ethnic Wear">Ethnic Wear</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#7D2AE8] font-black uppercase tracking-wider block mb-1.5">
                  Product Type *
                </label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold bg-white"
                >
                  {(SEGMENT_TYPES[productSegment] || []).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* BASIC METADATA */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-3">
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-1.5">
                  Product ID (slug) *
                </label>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase())}
                  placeholder="e.g. black-relaxed-cargo"
                  disabled={editMode}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-mono disabled:bg-black/5"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-1.5">
                  Brand *
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Zara"
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold"
                />
              </div>

              <div className="md:col-span-6">
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-1.5">
                  Product Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Premium Structured Navy Blazer"
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold"
                />
              </div>
            </div>

            {/* DESCRIPTION & FABRIC */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8">
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the silhouette, fit, drape, and tall suitability details..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-sans"
                />
              </div>

              <div className="md:col-span-4">
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-1.5">
                  Material / Fabric
                </label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g. 100% Cotton, Linen Blend"
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold"
                />
              </div>
            </div>

            {/* TAXONOMY CHIP PICKERS */}
            <div className="space-y-6 bg-[#FAF9F6] p-6 rounded-2xl border border-black/5">
              <h3 className="text-xs font-black uppercase tracking-wider text-black/60 border-b border-black/10 pb-2">
                Garment Taxonomy &amp; Tags
              </h3>

              {/* Broad Category */}
              <div>
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-2">
                  Broad Categories (Select Multiple)
                </label>
                <div className="flex flex-wrap gap-2">
                  {BROAD_CATEGORIES.map(cat => {
                    const isSelected = categories.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleSelection(cat, categories, setCategories)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          isSelected 
                            ? 'bg-[#7D2AE8] text-white shadow-sm' 
                            : 'bg-white text-black/65 border border-black/15 hover:border-[#7D2AE8]/50'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Occasions */}
              <div>
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-2">
                  Occasions (Select Multiple)
                </label>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map(occ => {
                    const isSelected = occasions.includes(occ);
                    return (
                      <button
                        type="button"
                        key={occ}
                        onClick={() => toggleSelection(occ, occasions, setOccasions)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          isSelected 
                            ? 'bg-[#7D2AE8] text-white shadow-sm' 
                            : 'bg-white text-black/65 border border-black/15 hover:border-[#7D2AE8]/50'
                        }`}
                      >
                        {occ}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seasons */}
              <div>
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-2">
                  Seasons
                </label>
                <div className="flex flex-wrap gap-2">
                  {SEASONS.map(s => {
                    const isSelected = seasons.includes(s);
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => toggleSelection(s, seasons, setSeasons)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          isSelected 
                            ? 'bg-[#7D2AE8] text-white shadow-sm' 
                            : 'bg-white text-black/65 border border-black/15 hover:border-[#7D2AE8]/50'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colors */}
              <div>
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-2">
                  Colors
                </label>
                <div className="flex flex-wrap gap-2.5 mb-2.5">
                  {COLORS.map(color => {
                    const isSelected = colors.includes(color.name);
                    return (
                      <button
                        type="button"
                        key={color.name}
                        onClick={() => toggleSelection(color.name, colors, setColors)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          isSelected 
                            ? 'bg-[#7D2AE8] text-white shadow-sm ring-2 ring-[#7D2AE8]/20' 
                            : 'bg-white text-black/65 border border-black/15 hover:border-[#7D2AE8]/50'
                        }`}
                      >
                        <span 
                          className="w-3.5 h-3.5 rounded-full shadow-inner border border-black/10" 
                          style={{ backgroundColor: color.hex }}
                        />
                        <span>{color.name}</span>
                      </button>
                    );
                  })}
                  {colors
                    .filter(c => !COLORS.some(opt => opt.name.toLowerCase() === c.toLowerCase()))
                    .map(customColor => (
                      <button
                        type="button"
                        key={customColor}
                        onClick={() => toggleSelection(customColor, colors, setColors)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-[#7D2AE8] text-white shadow-sm ring-2 ring-[#7D2AE8]/20"
                      >
                        <span 
                          className="w-3.5 h-3.5 rounded-full shadow-inner border border-black/10 bg-gradient-to-r from-violet-400 to-indigo-500" 
                        />
                        <span>{customColor}</span>
                        <X className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    ))}
                </div>
                <div className="flex gap-2 max-w-[240px]">
                  <input
                    type="text"
                    placeholder="Add custom color..."
                    className="flex-1 px-3 py-1.5 text-xs border border-black/15 rounded bg-white text-black placeholder:text-black/35 focus:outline-none focus:border-[#7D2AE8]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val) {
                          const formatted = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                          if (!colors.includes(formatted)) {
                            setColors([...colors, formatted]);
                          }
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-1.5">
                  Search &amp; Filter Tags (Type and press Enter or click Add)
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="e.g. relaxed-fit, extra-long"
                    className="px-3.5 py-2.5 rounded-xl border border-black/15 text-xs font-bold flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 bg-[#7D2AE8] hover:bg-[#6820C4] text-white font-grotesk font-black text-xs uppercase tracking-wider rounded-xl"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-[#7D2AE8]/10 text-[#7D2AE8] border border-[#7D2AE8]/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                      <span>{tag}</span>
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* IMAGE MANAGEMENT REDESIGN */}
            <div className="bg-[#FAF9F6] p-6 rounded-2xl border border-black/5 space-y-6">
              <div className="flex items-center justify-between border-b border-black/10 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-black/60">
                  Image Source &amp; Management
                </h3>
                
                <div className="flex rounded-lg border border-black/15 overflow-hidden text-[10px] font-black uppercase bg-white">
                  <button
                    type="button"
                    onClick={() => setImageSource('imported')}
                    className={`px-3 py-1.5 transition-all ${imageSource === 'imported' ? 'bg-[#7D2AE8] text-white' : 'hover:bg-black/5 text-black/60'}`}
                  >
                    Imported URLs
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSource('upload')}
                    className={`px-3 py-1.5 transition-all ${imageSource === 'upload' ? 'bg-[#7D2AE8] text-white' : 'hover:bg-black/5 text-black/60'}`}
                  >
                    Upload From Device
                  </button>
                </div>
              </div>

              {imageSource === 'imported' ? (
                <div className="space-y-4">
                  <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block">
                    Paste Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="px-3.5 py-2.5 rounded-xl border border-black/15 text-xs font-mono flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="px-4 bg-[#7D2AE8] hover:bg-[#6820C4] text-white font-grotesk font-black text-xs uppercase tracking-wider rounded-xl"
                    >
                      Add URL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-black/20 hover:border-[#7D2AE8]/50 rounded-2xl p-6 bg-white transition text-center relative cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleDeviceUploadSimulated}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload size={24} className="mx-auto text-black/30 mb-2" />
                  <span className="text-xs font-bold text-black/60 block">Drag &amp; Drop Images here</span>
                  <span className="text-[10px] text-black/40 font-sans block mt-1">or Click to browse local files</span>
                </div>
              )}

              {/* IMAGE PREVIEW GRID WITH DRAG-TO-REORDER */}
              {images.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[10px] text-black/45 block font-bold uppercase tracking-wider">
                    Garment Image Catalog ({images.length} Images - first image is primary showcase)
                  </span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {images.map((img, idx) => (
                      <div key={img + idx} className="group aspect-[3/4] bg-white border border-black/10 rounded-xl overflow-hidden relative shadow-sm hover:shadow-md transition">
                        <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        
                        {/* Hover Overlay Controls */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleMarkPrimaryImage(idx)}
                              title="Set as Primary"
                              className={`p-1.5 rounded-lg ${idx === 0 ? 'bg-[#7D2AE8] text-white' : 'bg-white/90 text-black hover:bg-white'}`}
                            >
                              <Star size={12} className={idx === 0 ? 'fill-white' : ''} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="p-1.5 rounded-lg bg-red-500/90 text-white hover:bg-red-600"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <div className="flex items-center justify-center gap-1 bg-white/20 rounded-lg py-1">
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 hover:text-[#00C4CC] text-white disabled:opacity-30"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <span className="text-[9px] font-mono font-black text-white px-1">#{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'down')}
                              disabled={idx === images.length - 1}
                              className="p-1 hover:text-[#00C4CC] text-white disabled:opacity-30"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-black/10 rounded-xl text-center text-[#112133]/50 text-xs italic">
                  No images loaded. Import a URL or add files.
                </div>
              )}
            </div>

            {/* TALL FIT CURATION - HERO SECTION */}
            <div className="border-2 border-[#7D2AE8] rounded-3xl p-6 bg-gradient-to-br from-[#7D2AE8]/5 to-transparent space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#7D2AE8]/20 pb-3">
                <div className="flex items-center gap-2">
                  <Ruler className="text-[#7D2AE8]" size={20} />
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#7D2AE8]">
                    🏆 TALL FIT CURATION ENGINE
                  </h3>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-black/55 font-black uppercase tracking-wider">
                    Tall Friendly Selection:
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={tallFriendly}
                      onChange={(e) => setTallFriendly(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-black/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:height-4 after:width-4 after:transition-all peer-checked:bg-[#00C4CC]"></div>
                    <span className="ml-2 text-xs font-black uppercase tracking-wide text-[#7D2AE8]">
                      {tallFriendly ? 'YES' : 'NO'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Checkbox Grids */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Recommended Height Range */}
                <div className="bg-white p-4 rounded-xl border border-[#7D2AE8]/15 space-y-3">
                  <label className="text-[10px] text-[#7D2AE8] font-black uppercase tracking-wider block border-b border-black/5 pb-1.5">
                    Recommended Height Ranges *
                  </label>
                  <div className="space-y-2">
                    {HEIGHT_RANGES.map(range => {
                      const isChecked = selectedHeightRanges.includes(range);
                      return (
                        <label key={range} className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-black/75">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelection(range, selectedHeightRanges, setSelectedHeightRanges)}
                            className="rounded text-[#7D2AE8] focus:ring-[#7D2AE8] w-4 h-4 border-black/15"
                          />
                          <span>{range} Tall Bands</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Body Types */}
                <div className="bg-white p-4 rounded-xl border border-[#7D2AE8]/15 space-y-3">
                  <label className="text-[10px] text-[#7D2AE8] font-black uppercase tracking-wider block border-b border-black/5 pb-1.5">
                    Body Types *
                  </label>
                  <div className="space-y-2">
                    {BODY_TYPES.map(type => {
                      const isChecked = selectedBodyTypes.includes(type);
                      return (
                        <label key={type} className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-black/75">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelection(type, selectedBodyTypes, setSelectedBodyTypes)}
                            className="rounded text-[#7D2AE8] focus:ring-[#7D2AE8] w-4 h-4 border-black/15"
                          />
                          <span>{type} Build</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Tall Fit Highlights */}
                <div className="bg-white p-4 rounded-xl border border-[#7D2AE8]/15 space-y-3">
                  <label className="text-[10px] text-[#7D2AE8] font-black uppercase tracking-wider block border-b border-black/5 pb-1.5">
                    Tall Fit Highlights *
                  </label>
                  <div className="space-y-2">
                    {FIT_HIGHLIGHTS.map(highlight => {
                      const isChecked = selectedFitHighlights.includes(highlight);
                      return (
                        <label key={highlight} className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-black/75">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelection(highlight, selectedFitHighlights, setSelectedFitHighlights)}
                            className="rounded text-[#7D2AE8] focus:ring-[#7D2AE8] w-4 h-4 border-black/15"
                          />
                          <span>{highlight}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sizes list (Dynamic based on Segment) */}
              <div className="bg-white p-4 rounded-xl border border-[#7D2AE8]/15 space-y-3">
                <label className="text-[10px] text-[#7D2AE8] font-black uppercase tracking-wider block border-b border-black/5 pb-1.5">
                  Select Curated Sizes Available (Tailored Proportions)
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {getSizeOptions(productSegment).map(sz => {
                    const isChecked = sizes.includes(sz);
                    return (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => toggleSelection(sz, sizes, setSizes)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                          isChecked 
                            ? 'bg-[#7D2AE8] text-white border-[#7D2AE8]' 
                            : 'bg-white text-black/60 border-black/15 hover:border-[#7D2AE8]/50'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* VERDICT NOTES FOR THE 4 BANDS */}
              <div className="bg-white p-4 rounded-xl border border-[#7D2AE8]/15 space-y-4">
                <label className="text-[10px] text-[#7D2AE8] font-black uppercase tracking-wider block border-b border-black/5 pb-1.5">
                  Anatomical Height-Band Fit Verdict Notes
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-black/45 block mb-1 font-bold">6'0"–6'1" Verdict Note</label>
                    <input 
                      type="text" 
                      value={verdict0_1_Note} 
                      onChange={(e) => setVerdict0_1_Note(e.target.value)}
                      className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-black/45 block mb-1 font-bold">6'2"–6'3" Verdict Note</label>
                    <input 
                      type="text" 
                      value={verdict2_3_Note} 
                      onChange={(e) => setVerdict2_3_Note(e.target.value)}
                      className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-black/45 block mb-1 font-bold">6'4"–6'5" Verdict Note</label>
                    <input 
                      type="text" 
                      value={verdict4_5_Note} 
                      onChange={(e) => setVerdict4_5_Note(e.target.value)}
                      className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-black/45 block mb-1 font-bold">6'6"+ Verdict Note</label>
                    <input 
                      type="text" 
                      value={verdict6_plus_Note} 
                      onChange={(e) => setVerdict6_plus_Note(e.target.value)}
                      className="w-full px-3 py-2 border border-black/15 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PRICING & AVAILABILITY */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-[#FAF9F6] p-5 rounded-2xl border border-black/5">
              <div>
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-1.5">
                  Price at Retailer (INR) *
                </label>
                <input
                  type="number"
                  value={priceAtRetailer}
                  onChange={(e) => setPriceAtRetailer(Number(e.target.value))}
                  placeholder="1999"
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-1.5">
                  Discount Percent (%)
                </label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-1.5">
                  Verified Tier *
                </label>
                <select
                  value={verifiedTier}
                  onChange={(e) => setVerifiedTier(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold bg-white"
                >
                  <option value="verified">Verified Fit</option>
                  <option value="friendly">Friendly Fit</option>
                  <option value="community">Community Fit</option>
                </select>
              </div>

              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-black/75">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded text-[#7D2AE8] focus:ring-[#7D2AE8] w-4 h-4 border-black/15"
                  />
                  <span>Feature on Home</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-black/75">
                  <input
                    type="checkbox"
                    checked={outOfStock}
                    onChange={(e) => setOutOfStock(e.target.checked)}
                    className="rounded text-[#7D2AE8] focus:ring-[#7D2AE8] w-4 h-4 border-black/15"
                  />
                  <span>Out of Stock</span>
                </label>
              </div>
            </div>

            {/* RETAILER DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#FAF9F6] p-5 rounded-2xl border border-black/5">
              <div>
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-1.5">
                  Primary Retailer *
                </label>
                <input
                  type="text"
                  value={retailer}
                  onChange={(e) => setRetailer(e.target.value)}
                  placeholder="e.g. Myntra"
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-bold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] text-black/50 font-black uppercase tracking-wider block mb-1.5">
                  Primary Affiliate Link URL *
                </label>
                <input
                  type="url"
                  value={affiliateUrl}
                  onChange={(e) => setAffiliateUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-mono"
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="px-6 py-4 bg-[#7D2AE8] hover:bg-[#6820C4] text-white rounded-2xl text-xs font-grotesk font-black uppercase tracking-wider transition-all shadow-md shadow-[#7D2AE8]/10"
              >
                {editMode ? 'Save Curated Product' : 'Create Curated Product'}
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-4 bg-black/5 hover:bg-black/10 text-black/70 rounded-2xl text-xs font-grotesk font-black uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER & SEARCH PANEL */}
      <div className="bg-[#FAF9F6] border border-black/10 rounded-2xl p-4 md:p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, brand, ID..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-black/15 text-xs font-bold bg-white focus:ring-2 focus:ring-[#7D2AE8]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-black/15 text-xs font-bold bg-white"
          >
            <option value="All">All Categories</option>
            {BROAD_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-black/15 text-xs font-bold bg-white"
          >
            <option value="All">All Stock Status</option>
            <option value="In Stock">In Stock Only</option>
            <option value="Out of Stock">Out of Stock Only</option>
          </select>
        </div>
      </div>

      {/* PRODUCTS TABLE LIST */}
      <div className="bg-white border border-[#112133]/15 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 md:p-6 border-b border-[#112133]/10 bg-[#FAF9F6] flex justify-between items-center">
          <h2 className="font-display text-lg uppercase font-black text-black/75">
            Curated Garments Catalogue ({filteredProducts.length})
          </h2>
          <span className="text-[10px] bg-black/10 text-black/60 px-2.5 py-1 rounded-full font-mono font-bold">
            Total active DB count: {products.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-black/5 text-[9px] font-black uppercase tracking-widest text-black/45 border-b border-[#112133]/10">
                <th className="py-3 px-6">Product Image</th>
                <th className="py-3 px-6">ID / Brand</th>
                <th className="py-3 px-6">Title</th>
                <th className="py-3 px-6">Segment / Type</th>
                <th className="py-3 px-6">Price</th>
                <th className="py-3 px-6">Availability</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#112133]/5 text-xs font-bold">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-black/3 transition-colors">
                  <td className="py-4 px-6">
                    <img 
                      src={p.images[0]} 
                      alt="" 
                      className="w-12 h-16 object-cover rounded-lg border border-black/10 shadow-inner" 
                      referrerPolicy="no-referrer"
                    />
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-[10px] font-mono block text-black/45">{p.id}</span>
                    <span className="text-xs font-black uppercase text-[#7D2AE8]">{p.brand}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="line-clamp-2 max-w-xs">{p.title}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="block text-[10px] text-black/55">{p.productSegment}</span>
                    <span className="block font-black text-[#00C4CC]">{p.productType}</span>
                  </td>
                  <td className="py-4 px-6 font-mono text-sm text-[#7D2AE8]">
                    ₹{p.priceAtRetailer.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => handleToggleStock(p)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide transition-all border ${
                        p.outOfStock 
                          ? 'bg-red-500/10 text-red-700 border-red-500/20' 
                          : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                      }`}
                    >
                      {p.outOfStock ? '✕ Out of Stock' : '✓ In Stock'}
                    </button>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEditForm(p)}
                        className="p-2 bg-[#FAF9F6] border border-black/15 text-[#112133] hover:text-[#7D2AE8] hover:border-[#7D2AE8]/30 rounded-xl transition"
                        title="Edit Entry"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(p)}
                        className="p-2 bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition"
                        title="Delete Entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#112133]/50 italic">
                    No curated products matching filter query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
