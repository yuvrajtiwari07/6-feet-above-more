import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Wand2, Save } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useApp } from '../../lib/context/AppContext';
import { apiFetch } from '../../lib/context/AppContext';
import { Product, FitVerdict } from '../../lib/types';

const BROAD_CATEGORIES = [
  'Casual Wear', 'Formal Wear', 'Athleisure', 'Streetwear',
  'Business Casual', 'Ethnic Wear', 'Winter Wear', 'Summer Wear',
  'Travel Wear', 'Gym Wear', 'Outdoor Wear',
];
const PRODUCT_SEGMENTS = ['Upperwear', 'Bottomwear', 'Footwear', 'Outerwear', 'Ethnic Wear', 'Accessories'];
const OCCASIONS = ['Office', 'College', 'Casual', 'Travel', 'Vacation', 'Wedding', 'Date Night', 'Festive', 'Gym', 'Brunch'];
const SEASONS = ['Summer', 'Winter'];
const VERIFIED_TIERS: Product['verifiedTier'][] = ['verified', 'friendly', 'community'];
const BODY_TYPES: NonNullable<FitVerdict['bodyTypes']>[number][] = ['Slim', 'Athletic', 'Broad', 'Overweight'];
const FIT_RECOMMENDATIONS = [
  'Highly Recommended', 'Recommended', 'Good Fit', 'Relaxed Fit',
  'Oversized Fit', 'Slightly Small', 'Tight Fit', 'Not Recommended',
];
const DEFAULT_HEIGHT_BANDS = ["6'0\" - 6'2\"", "6'2\" - 6'4\"", "6'4\" - 6'6\"", "6'6\" - 6'8\"", "6'8\"+"];

function detectSegmentAndType(title: string, category: string, subCategory: string) {
  const t = `${title || ''} ${category || ''} ${subCategory || ''}`.toLowerCase();
  if (t.match(/jeans|trouser|pant|cargo|chino|shorts/)) {
    return { productSegment: 'Bottomwear', productType: t.includes('jeans') ? 'Jeans' : t.includes('cargo') ? 'Cargo Pants' : t.includes('jogger') ? 'Joggers' : t.includes('chino') ? 'Chinos' : t.includes('shorts') ? 'Shorts' : 'Trousers' };
  }
  if (t.match(/shoe|sneaker|boot|loafer/)) {
    return { productSegment: 'Footwear', productType: t.includes('sneaker') ? 'Sneakers' : t.includes('boot') ? 'Boots' : t.includes('loafer') ? 'Loafers' : 'Formal Shoes' };
  }
  if (t.match(/hoodie|sweatshirt|jacket|overshirt/)) {
    return { productSegment: 'Outerwear', productType: t.includes('hoodie') ? 'Hoodie' : t.includes('sweatshirt') ? 'Sweatshirt' : t.includes('overshirt') ? 'Overshirt' : 'Jacket' };
  }
  if (t.match(/kurta|nehru/)) {
    return { productSegment: 'Ethnic Wear', productType: t.includes('set') ? 'Kurta Set' : t.includes('nehru') ? 'Nehru Jacket' : 'Kurta' };
  }
  if (t.match(/belt|cap|wallet|socks/)) {
    return { productSegment: 'Accessories', productType: t.includes('belt') ? 'Belt' : t.includes('cap') ? 'Cap' : t.includes('wallet') ? 'Wallet' : 'Socks' };
  }
  return { productSegment: 'Upperwear', productType: t.includes('polo') ? 'Polo T-Shirt' : t.includes('shirt') ? 'Shirt' : 'T-Shirt' };
}

const csv = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

function emptyVerdicts(): FitVerdict[] {
  return DEFAULT_HEIGHT_BANDS.map(heightRange => ({ heightRange, bodyTypes: [], fitRecommendation: 'Good Fit', note: '' }));
}

const Chip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <Pressable onPress={onPress} className={`px-3 py-1.5 rounded-full mr-2 mb-2 ${active ? 'bg-[#7D2AE8]' : 'bg-[#112133]/5'}`}>
    <Text className={`text-[10px] font-black uppercase ${active ? 'text-white' : 'text-[#112133]/60'}`}>{label}</Text>
  </Pressable>
);

const FieldLabel: React.FC<{ children: string }> = ({ children }) => (
  <Text className="text-[10px] font-black uppercase tracking-widest text-[#112133]/50 mb-1.5 mt-4">{children}</Text>
);

const Input: React.FC<React.ComponentProps<typeof TextInput>> = (props) => (
  <TextInput
    placeholderTextColor="#11213360"
    className="bg-white border border-black/10 rounded-xl px-3.5 py-3 text-sm text-[#112133]"
    {...props}
  />
);

export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { products, addProduct, updateProduct } = useApp();
  const editing = products.find(p => p.id === id);
  const isEdit = !!editing;

  const [productId, setProductId] = useState(editing?.id ?? `prod-${Date.now().toString().slice(-4)}`);
  const [idTouched, setIdTouched] = useState(isEdit);
  const [brand, setBrand] = useState(editing?.brand ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [category, setCategory] = useState(editing?.category ?? BROAD_CATEGORIES[0]);
  const [subCategory, setSubCategory] = useState(editing?.subCategory ?? '');
  const [productSegment, setProductSegment] = useState(editing?.productSegment ?? PRODUCT_SEGMENTS[0]);
  const [productType, setProductType] = useState(editing?.productType ?? '');
  const [retailer, setRetailer] = useState(editing?.retailer ?? '');
  const [affiliateUrl, setAffiliateUrl] = useState(editing?.affiliateUrl ?? '');
  const [priceAtRetailer, setPriceAtRetailer] = useState(editing?.priceAtRetailer ? String(editing.priceAtRetailer) : '');
  const [discountPercent, setDiscountPercent] = useState(editing?.discountPercent ? String(editing.discountPercent) : '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [material, setMaterial] = useState(editing?.material ?? '');
  const [fitType, setFitType] = useState(editing?.fitType ?? '');
  const [imagesText, setImagesText] = useState((editing?.images ?? []).join('\n'));
  const [colorsText, setColorsText] = useState((editing?.colors ?? []).join(', '));
  const [sizesText, setSizesText] = useState((editing?.sizes ?? []).join(', '));
  const [tagsText, setTagsText] = useState((editing?.tags ?? []).join(', '));
  const [occasions, setOccasions] = useState<string[]>(editing?.occasions ?? []);
  const [seasons, setSeasons] = useState<string[]>(editing?.seasons ?? []);
  const [outOfStock, setOutOfStock] = useState(!!editing?.outOfStock);
  const [isFeatured, setIsFeatured] = useState(!!editing?.isFeatured);
  const [tallFriendly, setTallFriendly] = useState(editing?.tallFriendly ?? true);
  const [verifiedTier, setVerifiedTier] = useState<Product['verifiedTier']>(editing?.verifiedTier ?? 'community');
  const [verdicts, setVerdicts] = useState<FitVerdict[]>(editing?.verdicts?.length ? editing.verdicts : emptyVerdicts());

  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (idTouched || !title) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    if (slug) setProductId(slug);
  }, [title, idTouched]);

  const toggleArrItem = (arr: string[], setArr: (a: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
  };

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      let data: any;
      try {
        data = await apiFetch('/api/curate/import-url', { method: 'POST', body: JSON.stringify({ url: importUrl.trim() }) });
      } catch {
        const fallback = await apiFetch('/api/admin/import-product', { method: 'POST', body: JSON.stringify({ url: importUrl.trim() }) });
        data = { ...fallback.product, images: fallback.product?.images };
      }

      if (data.brand) setBrand(data.brand);
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.category) setCategory(data.category);
      if (data.subCategory) setSubCategory(data.subCategory);
      if (data.material) setMaterial(data.material);
      if (data.retailer) setRetailer(data.retailer);
      if (typeof data.price === 'number') setPriceAtRetailer(String(data.price));
      if (data.discountPercent) setDiscountPercent(String(data.discountPercent));
      if (Array.isArray(data.images) && data.images.length) setImagesText(data.images.join('\n'));
      if (Array.isArray(data.colors) && data.colors.length) setColorsText(data.colors.join(', '));
      if (Array.isArray(data.sizes) && data.sizes.length) setSizesText(data.sizes.join(', '));
      if (Array.isArray(data.occasions)) setOccasions(data.occasions);
      if (Array.isArray(data.seasons)) setSeasons(data.seasons);
      if (data.retailerUrl && !affiliateUrl) setAffiliateUrl(data.retailerUrl);

      const { productSegment: seg, productType: typ } = detectSegmentAndType(data.title || title, data.category || category, data.subCategory || subCategory);
      setProductSegment(seg);
      setProductType(typ);

      if (data.tallFit) {
        if (typeof data.tallFit.tallFriendly === 'boolean') setTallFriendly(data.tallFit.tallFriendly);
      }

      Alert.alert('Imported', 'Form pre-filled from the URL. Review and save.');
    } catch (e: any) {
      Alert.alert('Import failed', e.message ?? 'Could not import from that URL.');
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    if (!productId.trim() || !brand.trim() || !title.trim() || !priceAtRetailer.trim()) {
      Alert.alert('Missing fields', 'Product ID, brand, title, and price are required.');
      return;
    }
    const payload: Product = {
      id: productId.trim().toLowerCase(),
      brand: brand.trim(),
      title: title.trim(),
      category,
      subCategory: subCategory.trim() || undefined,
      productSegment,
      productType: productType.trim(),
      images: imagesText.split('\n').map(x => x.trim()).filter(Boolean),
      occasions,
      seasons,
      colors: csv(colorsText),
      fitType: fitType.trim(),
      retailer: retailer.trim(),
      affiliateUrl: affiliateUrl.trim(),
      priceAtRetailer: Number(priceAtRetailer),
      verdicts,
      verifiedTier: verifiedTier ?? 'community',
      description: description.trim() || undefined,
      outOfStock,
      sizes: csv(sizesText),
      tags: csv(tagsText),
      discountPercent: discountPercent ? Number(discountPercent) : undefined,
      isFeatured,
      tallFriendly,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateProduct(payload.id, payload);
      } else {
        await addProduct(payload);
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-black/10">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5">
          <ArrowLeft size={18} color="#112133" />
          <Text className="text-sm font-black uppercase tracking-wide text-[#112133]">Back</Text>
        </Pressable>
        <Text className="text-sm font-black uppercase text-[#112133]">{isEdit ? 'Edit Product' : 'Add Product'}</Text>
        <Pressable onPress={handleSave} disabled={saving} className="flex-row items-center gap-1.5 bg-[#7D2AE8] px-3.5 py-2 rounded-xl">
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={13} color="#fff" />}
          <Text className="text-[11px] font-black uppercase text-white">Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {!isEdit && (
          <View className="bg-[#7D2AE8]/5 border border-[#7D2AE8]/20 rounded-2xl p-4 mb-2">
            <Text className="text-[10px] font-black uppercase tracking-widest text-[#7D2AE8] mb-2">Import from URL</Text>
            <View className="flex-row gap-2">
              <Input
                value={importUrl}
                onChangeText={setImportUrl}
                placeholder="https://www.myntra.com/product/..."
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={{ flex: 1 }}
              />
              <Pressable onPress={handleImport} disabled={importing || !importUrl.trim()}
                className={`px-4 items-center justify-center rounded-xl ${importUrl.trim() ? 'bg-[#7D2AE8]' : 'bg-[#112133]/10'}`}>
                {importing ? <ActivityIndicator size="small" color="#fff" /> : <Wand2 size={16} color={importUrl.trim() ? '#fff' : '#112133'} />}
              </Pressable>
            </View>
            <Text className="text-[10px] text-[#112133]/40 mt-2">Pre-fills the form below. Nothing is saved until you tap Save.</Text>
          </View>
        )}

        <FieldLabel>Product ID</FieldLabel>
        <Input value={productId} onChangeText={t => { setIdTouched(true); setProductId(t.toLowerCase().replace(/[^a-z0-9_-]/g, '')); }}
          autoCapitalize="none" autoCorrect={false} />

        <FieldLabel>Brand</FieldLabel>
        <Input value={brand} onChangeText={setBrand} placeholder="Zara" />

        <FieldLabel>Title</FieldLabel>
        <Input value={title} onChangeText={setTitle} placeholder="Premium Structured Navy Suit Blazer" />

        <FieldLabel>Category</FieldLabel>
        <View className="flex-row flex-wrap">
          {BROAD_CATEGORIES.map(c => <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />)}
        </View>

        <FieldLabel>Product segment</FieldLabel>
        <View className="flex-row flex-wrap">
          {PRODUCT_SEGMENTS.map(s => <Chip key={s} label={s} active={productSegment === s} onPress={() => setProductSegment(s)} />)}
        </View>

        <FieldLabel>Product type</FieldLabel>
        <Input value={productType} onChangeText={setProductType} placeholder="Blazer, T-Shirt, Jeans..." />

        <FieldLabel>Sub-category</FieldLabel>
        <Input value={subCategory} onChangeText={setSubCategory} placeholder="Blazers" />

        <FieldLabel>Retailer</FieldLabel>
        <Input value={retailer} onChangeText={setRetailer} placeholder="Zara India" />

        <FieldLabel>Affiliate / product URL</FieldLabel>
        <Input value={affiliateUrl} onChangeText={setAffiliateUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" />

        <View className="flex-row gap-3">
          <View style={{ flex: 1 }}>
            <FieldLabel>Price (₹)</FieldLabel>
            <Input value={priceAtRetailer} onChangeText={setPriceAtRetailer} keyboardType="numeric" placeholder="2999" />
          </View>
          <View style={{ flex: 1 }}>
            <FieldLabel>Discount %</FieldLabel>
            <Input value={discountPercent} onChangeText={setDiscountPercent} keyboardType="numeric" placeholder="20" />
          </View>
        </View>

        <FieldLabel>Description</FieldLabel>
        <Input value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top' }} />

        <FieldLabel>Material</FieldLabel>
        <Input value={material} onChangeText={setMaterial} placeholder="Cotton, Linen..." />

        <FieldLabel>Fit type</FieldLabel>
        <Input value={fitType} onChangeText={setFitType} placeholder="Slim Tall, Oversized Loose..." />

        <FieldLabel>Images (one URL per line)</FieldLabel>
        <Input value={imagesText} onChangeText={setImagesText} multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top' }} autoCapitalize="none" />

        <FieldLabel>Colors (comma separated)</FieldLabel>
        <Input value={colorsText} onChangeText={setColorsText} placeholder="Navy, Blue" />

        <FieldLabel>Sizes (comma separated)</FieldLabel>
        <Input value={sizesText} onChangeText={setSizesText} placeholder="S, M, L, XL" />

        <FieldLabel>Tags (comma separated)</FieldLabel>
        <Input value={tagsText} onChangeText={setTagsText} placeholder="tall-friendly, streetwear" />

        <FieldLabel>Occasions</FieldLabel>
        <View className="flex-row flex-wrap">
          {OCCASIONS.map(o => <Chip key={o} label={o} active={occasions.includes(o)} onPress={() => toggleArrItem(occasions, setOccasions, o)} />)}
        </View>

        <FieldLabel>Seasons</FieldLabel>
        <View className="flex-row flex-wrap">
          {SEASONS.map(s => <Chip key={s} label={s} active={seasons.includes(s)} onPress={() => toggleArrItem(seasons, setSeasons, s)} />)}
        </View>

        <FieldLabel>Verified tier</FieldLabel>
        <View className="flex-row flex-wrap">
          {VERIFIED_TIERS.map(v => <Chip key={v} label={v!} active={verifiedTier === v} onPress={() => setVerifiedTier(v)} />)}
        </View>

        <View className="flex-row items-center justify-between mt-5 bg-white rounded-xl px-4 py-3 border border-black/5">
          <Text className="text-xs font-bold text-[#112133]">Out of stock</Text>
          <Switch value={outOfStock} onValueChange={setOutOfStock} trackColor={{ true: '#EF4444' }} />
        </View>
        <View className="flex-row items-center justify-between mt-2 bg-white rounded-xl px-4 py-3 border border-black/5">
          <Text className="text-xs font-bold text-[#112133]">Featured</Text>
          <Switch value={isFeatured} onValueChange={setIsFeatured} trackColor={{ true: '#FFD43B' }} />
        </View>
        <View className="flex-row items-center justify-between mt-2 mb-2 bg-white rounded-xl px-4 py-3 border border-black/5">
          <Text className="text-xs font-bold text-[#112133]">Tall friendly</Text>
          <Switch value={tallFriendly} onValueChange={setTallFriendly} trackColor={{ true: '#7D2AE8' }} />
        </View>

        {/* Fit by height */}
        <Text className="text-sm font-black uppercase tracking-wide text-[#112133] mt-6 mb-1">Fit by Height</Text>
        <Text className="text-[10px] text-[#112133]/40 mb-3">Set the recommendation admins see for each height band.</Text>
        {verdicts.map((v, i) => (
          <View key={v.heightRange} className="bg-white rounded-2xl p-4 mb-3 border border-black/5">
            <Text className="text-xs font-black text-[#112133] mb-2">{v.heightRange}</Text>

            <Text className="text-[9px] font-black uppercase tracking-widest text-[#112133]/40 mb-1.5">Body types</Text>
            <View className="flex-row flex-wrap mb-1">
              {BODY_TYPES.map(bt => (
                <Chip key={bt} label={bt} active={!!v.bodyTypes?.includes(bt)}
                  onPress={() => setVerdicts(prev => prev.map((pv, pi) => pi !== i ? pv : {
                    ...pv,
                    bodyTypes: pv.bodyTypes?.includes(bt) ? pv.bodyTypes.filter(x => x !== bt) : [...(pv.bodyTypes ?? []), bt],
                  }))} />
              ))}
            </View>

            <Text className="text-[9px] font-black uppercase tracking-widest text-[#112133]/40 mb-1.5 mt-1">Recommendation</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {FIT_RECOMMENDATIONS.map(fr => (
                  <Chip key={fr} label={fr} active={v.fitRecommendation === fr}
                    onPress={() => setVerdicts(prev => prev.map((pv, pi) => pi !== i ? pv : { ...pv, fitRecommendation: fr }))} />
                ))}
              </View>
            </ScrollView>

            <Text className="text-[9px] font-black uppercase tracking-widest text-[#112133]/40 mb-1.5 mt-1">Note</Text>
            <Input value={v.note ?? ''} onChangeText={t => setVerdicts(prev => prev.map((pv, pi) => pi !== i ? pv : { ...pv, note: t }))}
              multiline numberOfLines={2} style={{ minHeight: 50, textAlignVertical: 'top' }} placeholder={`Verified by 6'3" — sits perfectly at the knee.`} />
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}
