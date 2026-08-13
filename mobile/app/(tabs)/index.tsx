import React from 'react';
import { View, Text, Pressable, FlatList, ScrollView, ImageBackground, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Shield, Star, Sparkles, Layers } from 'lucide-react-native';
import { MotiView } from 'moti';
import { router } from 'expo-router';
import { useApp } from '../../lib/context/AppContext';
import { Header } from '../../components/layout/Header';
import { GridDensitySelector } from '../../components/layout/GridDensitySelector';
import { ProductCard, ProductCardSkeleton } from '../../components/product/ProductCard';
import { getProductRecommendation } from '../../lib/utils/fitEngine';
import { WELLNESS_CATEGORIES } from '../../lib/data/wellness';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2-col with padding

const FASHION_CATEGORIES = [
  { name: 'Streetwear', icon: '⚡', color: '#0F0F10', textColor: '#fff', accent: '#FFCC00' },
  { name: 'Formals',    icon: '👔', color: '#fff',    textColor: '#112133', accent: '#FFD43B' },
  { name: 'Ethnic Wear',icon: '🔱', color: '#FFD43B', textColor: '#000',   accent: '#7D2AE8' },
  { name: 'Summer',     icon: '🌴', color: '#00AFB9', textColor: '#fff',   accent: '#fff' },
  { name: 'Winter',     icon: '❄️', color: '#112133', textColor: '#fff',   accent: '#FFD43B' },
];

const WELLNESS_TILES = WELLNESS_CATEGORIES.map(c => ({
  name: c.name, icon: c.icon, color: c.bg, textColor: c.text, accent: c.accent,
}));

const FASHION_BRANDS = ['ZARA', 'H&M', 'MYNTRA', 'RAYMOND', 'MANYAVAR', 'WESTSIDE', 'UNIQLO'];
const WELLNESS_BRANDS = ['NUTRABAY', 'THE DERMA CO', 'KAPIVA', 'MUSCLEBLAZE', 'NETMEDS', 'MCAFFEINE'];

export default function HomeScreen() {
  const { height, bodyType, cardSize, products, loadingProducts, catalogCategories, isWellness } = useApp();
  const activeCatalogCategories = catalogCategories.filter(c => c.isActive).slice(0, 6);

  const CATEGORIES = isWellness ? WELLNESS_TILES : FASHION_CATEGORIES;
  const BRANDS = isWellness ? WELLNESS_BRANDS : FASHION_BRANDS;

  const verifiedProducts = isWellness ? [] : products.filter(p => {
    const rec = getProductRecommendation(p.verdicts, height, bodyType);
    return rec && (rec.fitRecommendation === 'Highly Recommended' || rec.fitRecommendation === 'Recommended') && !p.outOfStock;
  }).slice(0, 6);

  const railProducts = verifiedProducts.length > 0 ? verifiedProducts : products.filter(p => !p.outOfStock).slice(0, 6);

  const numCols = cardSize === 'small' ? 3 : cardSize === 'large' ? 1 : 2;
  const cardW = cardSize === 'large'
    ? SCREEN_WIDTH - 32
    : cardSize === 'small'
      ? (SCREEN_WIDTH - 40) / 3
      : CARD_WIDTH;

  return (
    <View className="flex-1 bg-[#F9F8F6]">
      <Header />
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">

        {/* 1. Hero */}
        <View
          className="mx-4 mt-4 rounded-[28px] overflow-hidden p-7 min-h-[300px]"
          style={{ backgroundColor: isWellness ? '#0E2A21' : '#0F0F10' }}
        >
          <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 500 }}>
            <View
              className="flex-row items-center gap-2 self-start px-4 py-2 rounded-full mb-5 border-2 border-black"
              style={{ backgroundColor: isWellness ? '#7BE3B4' : '#FFD43B' }}
            >
              <Star size={11} color="#000" fill="#000" />
              <Text className="text-[10px] font-black uppercase tracking-widest text-black">
                {isWellness ? 'FOR EVERY HEIGHT, EVERY BODY' : 'EXCLUSIVELY FOR 6FT & ABOVE'}
              </Text>
            </View>
          </MotiView>

          {isWellness ? (
            <Text className="text-4xl font-black text-white leading-tight tracking-tighter mb-2">
              NUTRITION,{'\n'}
              <Text className="text-[#7BE3B4]">SKIN & HEALTH{'\n'}</Text>
              CARE.
            </Text>
          ) : (
            <Text className="text-4xl font-black text-white leading-tight tracking-tighter mb-2">
              CLOTHES THAT{'\n'}
              <Text className="text-[#FFD43B]">FINALLY{'\n'}</Text>
              FIT YOU.
            </Text>
          )}

          <Text className="text-xs text-neutral-300 font-semibold leading-relaxed mb-6 max-w-xs">
            {isWellness ? (
              <>
                Supplements, ayurveda and body care picked for what is actually in them.{' '}
                <Text className="text-[#7BE3B4] font-bold">No height gate.</Text>
              </>
            ) : (
              <>
                Curated clothing for taller frames. Better proportions, better comfort,{' '}
                <Text className="text-[#FFD43B] font-bold">better you.</Text>
              </>
            )}
          </Text>

          <View className="flex-row gap-3 flex-wrap">
            <Pressable
              onPress={() => router.push('/(tabs)/search')}
              className="flex-row items-center gap-2 px-6 py-3 rounded-xl border-2 border-black"
              style={{ backgroundColor: isWellness ? '#7BE3B4' : '#FFD43B' }}
            >
              <Text className="text-black font-black text-xs uppercase tracking-wider">Explore</Text>
              <ArrowRight size={13} color="#000" />
            </Pressable>
            {!isWellness && (
              <Pressable
                onPress={() => router.push('/fit-finder')}
                className="flex-row items-center gap-2 border-2 border-[#FFD43B] px-6 py-3 rounded-xl"
              >
                <Text className="text-[#FFD43B] font-black text-xs uppercase tracking-wider">Find My Fit</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* 2. Category tiles */}
        <View className="mt-6 px-4">
          <Text className="text-[#112133] font-black text-xl uppercase tracking-tight mb-4">
            {isWellness ? 'Browse Aisles' : 'Browse Worlds'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
            <View className="flex-row gap-3">
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat.name}
                  onPress={() => router.push(`/category/${encodeURIComponent(cat.name)}`)}
                  className="w-36 h-44 rounded-2xl overflow-hidden justify-end p-4 border-2 border-black"
                  style={{ backgroundColor: cat.color }}
                >
                  <Text className="text-2xl mb-1">{cat.icon}</Text>
                  <Text className="font-black text-base uppercase tracking-tight" style={{ color: cat.textColor }}>{cat.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 2b. Curated catalogs teaser */}
        {activeCatalogCategories.length > 0 && (
          <View className="mt-8 px-4">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-1.5">
                <Sparkles size={15} color="#7D2AE8" />
                <Text className="text-[#112133] font-black text-xl uppercase tracking-tight">Curated Catalogs</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/catalogs')} className="flex-row items-center gap-1">
                <Text className="text-xs font-bold uppercase text-[#112133]">See All</Text>
                <ArrowRight size={13} color="#112133" />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
              <View className="flex-row gap-3">
                {activeCatalogCategories.map(cat => (
                  <Pressable
                    key={cat.id}
                    onPress={() => router.push(`/catalog-category/${encodeURIComponent(cat.name)}`)}
                    className="w-32 h-24 rounded-xl overflow-hidden justify-end p-3 bg-[#0F0F10] border-2 border-black"
                  >
                    <Text className="text-white font-black text-xs uppercase tracking-tight" numberOfLines={2}>{cat.name}</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => router.push('/complete-fits')}
                  className="w-32 h-24 rounded-xl overflow-hidden justify-end p-3 bg-[#7D2AE8] border-2 border-black"
                >
                  <Layers size={14} color="#FFD43B" />
                  <Text className="text-white font-black text-xs uppercase tracking-tight mt-1">Lookbooks</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        )}

        {/* 3. Product rail */}
        <View className="mt-8 px-4">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <View className="flex-row items-center gap-1.5 mb-1">
                <Shield size={13} color="#FFD43B" />
                <Text className="text-[9px] text-black/50 font-black uppercase tracking-widest">
                {isWellness ? 'Label Checked' : 'Human-Tested'}
              </Text>
              </View>
              <Text className="text-[#112133] font-black text-lg uppercase tracking-tight">
                {isWellness ? 'Picked For You' : 'Handpicked Fits'}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <GridDensitySelector />
              <Pressable onPress={() => router.push('/(tabs)/search')} className="flex-row items-center gap-1">
                <Text className="text-xs font-bold uppercase text-[#112133]">See All</Text>
                <ArrowRight size={13} color="#112133" />
              </Pressable>
            </View>
          </View>

          {loadingProducts ? (
            <View className="flex-row flex-wrap gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={{ width: cardW }}>
                  <ProductCardSkeleton size={cardSize} />
                </View>
              ))}
            </View>
          ) : (
            <View className={`flex-row flex-wrap gap-3`}>
              {railProducts.map(product => (
                <View key={product.id} style={{ width: cardW }}>
                  <ProductCard product={product} cardWidth={cardW} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 4. Brand strip */}
        <View className="mt-10 mb-8 py-8 border-y-2 border-black bg-white">
          <Text className="text-center text-[9px] text-[#112133]/40 font-black uppercase tracking-[0.25em] mb-5">
            Curated affiliate partnerships
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
            <View className="flex-row gap-8 items-center">
              {BRANDS.map(brand => (
                <Text key={brand} className="font-black text-xl tracking-widest text-[#112133]/50">{brand}</Text>
              ))}
            </View>
          </ScrollView>
        </View>

      </ScrollView>
    </View>
  );
}
