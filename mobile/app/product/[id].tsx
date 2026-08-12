import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Heart, ArrowLeft, ExternalLink, Star, ChevronDown, ChevronUp, Check } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, router } from 'expo-router';
import { useApp } from '../../lib/context/AppContext';
import { getProductRecommendation, isPositiveRecommendation } from '../../lib/utils/fitEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMG_H = SCREEN_WIDTH * 1.15;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, height, bodyType, savedProductIds, toggleSaveProduct } = useApp();
  const product = products.find(p => p.id === id);
  const insets = useSafeAreaInsets();

  const [imgIndex, setImgIndex] = useState(0);
  const [descOpen, setDescOpen] = useState(false);
  const [verdictOpen, setVerdictOpen] = useState(true);
  const flatRef = useRef<FlatList>(null);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setImgIndex(idx);
  }, []);

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-[#112133] font-bold">Product not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4 bg-[#7D2AE8] px-6 py-3 rounded-xl">
          <Text className="text-white font-black text-xs uppercase">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isSaved = savedProductIds.includes(product.id);
  const isWellnessProduct = (product.vertical ?? 'fashion') === 'wellness';
  const rec = isWellnessProduct ? null : getProductRecommendation(product.verdicts, height, bodyType);
  const positive = rec && isPositiveRecommendation(rec.fitRecommendation);
  const images = product.images?.length ? product.images : [''];

  const fitColor = rec?.fitRecommendation.includes('Highly')
    ? '#22C55E'
    : positive ? '#FFD43B'
    : '#EF4444';

  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom }}>

        {/* Image carousel */}
        <View style={{ height: IMG_H }}>
          <FlatList
            ref={flatRef}
            data={images}
            keyExtractor={(_, i) => String(i)}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, height: IMG_H }}>
                <Image source={item} style={{ width: SCREEN_WIDTH, height: IMG_H }} contentFit="cover" />
              </View>
            )}
          />

          {/* Nav bar overlay */}
          <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
            <View className="flex-row items-center justify-between px-4 py-3">
              <Pressable onPress={() => router.back()}
                className="w-10 h-10 bg-black/30 rounded-full items-center justify-center backdrop-blur">
                <ArrowLeft size={18} color="#fff" />
              </Pressable>
              <Pressable onPress={() => toggleSaveProduct(product.id)}
                className="w-10 h-10 bg-black/30 rounded-full items-center justify-center">
                <Heart size={18} color={isSaved ? '#FF3E90' : '#fff'} fill={isSaved ? '#FF3E90' : 'transparent'} />
              </Pressable>
            </View>
          </SafeAreaView>

          {/* Image dots */}
          {images.length > 1 && (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5">
              {images.map((_, i) => (
                <View key={i} style={{ width: i === imgIndex ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === imgIndex ? '#FFD43B' : '#fff' }} />
              ))}
            </View>
          )}

          {/* Out of stock banner */}
          {product.outOfStock && (
            <View className="absolute inset-0 bg-black/50 items-center justify-center">
              <View className="bg-white px-8 py-4 rounded-2xl">
                <Text className="font-black text-xl text-[#112133] uppercase">Out of Stock</Text>
              </View>
            </View>
          )}
        </View>

        {/* Content */}
        <View className="px-5 pt-5 pb-10">

          {/* Brand + title */}
          <Text className="text-[10px] font-black uppercase tracking-widest text-[#7D2AE8] mb-1">{product.brand}</Text>
          <Text className="text-2xl font-black text-[#112133] leading-tight mb-2">{product.title}</Text>

          {/* Price + category */}
          <View className="flex-row items-center gap-3 mb-4">
            {!!product.priceAtRetailer && (
              <Text className="text-xl font-black text-[#0F0F10]">₹{product.priceAtRetailer.toLocaleString('en-IN')}</Text>
            )}
            <View className="bg-[#112133]/5 px-3 py-1 rounded-full">
              <Text className="text-[10px] font-black uppercase text-[#112133]/60">{product.category}</Text>
            </View>
          </View>

          {/* Fit verdict */}
          {rec && (
            <Pressable onPress={() => setVerdictOpen(v => !v)}
              className="bg-[#F9F8F6] rounded-2xl p-4 mb-4 border border-black/5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fitColor }} />
                  <Text className="text-xs font-black uppercase tracking-wider" style={{ color: fitColor }}>
                    {rec.fitRecommendation}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className="text-[10px] font-bold text-[#112133]/50 uppercase">For {height}</Text>
                  {verdictOpen ? <ChevronUp size={13} color="#112133" /> : <ChevronDown size={13} color="#112133" />}
                </View>
              </View>
              {verdictOpen && rec.note && (
                <Text className="text-xs text-[#112133]/70 leading-relaxed mt-3">{rec.note}</Text>
              )}
            </Pressable>
          )}

          {/* Wellness fact sheet */}
          {isWellnessProduct && (
            <View className="bg-[#F4FAF7] rounded-2xl p-4 mb-4 border border-[#0E7C5A]/15">
              <View className="flex-row flex-wrap gap-2 mb-3">
                {[product.productType, product.form, product.netQuantity].filter(Boolean).map(v => (
                  <View key={v as string} className="bg-white border border-black/5 px-3 py-1.5 rounded-xl">
                    <Text className="text-[10px] font-black uppercase text-[#112133]/70">{v}</Text>
                  </View>
                ))}
              </View>

              {(product.concerns?.length ?? 0) > 0 && (
                <>
                  <Text className="text-[9px] font-black uppercase tracking-widest text-[#112133]/45 mb-1.5">Helps with</Text>
                  <View className="flex-row flex-wrap gap-1.5 mb-3">
                    {product.concerns!.map(c => (
                      <View key={c} className="bg-[#0E7C5A] px-2.5 py-1 rounded-full">
                        <Text className="text-[10px] font-black uppercase text-white">{c}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {(product.keyIngredients?.length ?? 0) > 0 && (
                <>
                  <Text className="text-[9px] font-black uppercase tracking-widest text-[#112133]/45 mb-1.5">Key ingredients</Text>
                  <View className="flex-row flex-wrap gap-1.5 mb-3">
                    {product.keyIngredients!.map(i => (
                      <View key={i} className="bg-[#112133]/5 border border-black/5 px-2.5 py-1 rounded-full">
                        <Text className="text-[10px] font-bold text-[#112133]">{i}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {(product.dietTags?.length ?? 0) > 0 && (
                <View className="flex-row flex-wrap gap-1.5 mb-3">
                  {product.dietTags!.map(d => (
                    <View key={d} className="bg-[#FFD43B] border border-black/10 px-2.5 py-1 rounded-full">
                      <Text className="text-[10px] font-black uppercase text-black">✓ {d}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text className="text-[10px] text-[#112133]/45 leading-relaxed border-t border-black/5 pt-2.5">
                Not a medicine. Check with a doctor before starting something new.
              </Text>
            </View>
          )}

          {/* CTA button */}
          {!!product.affiliateUrl && !product.outOfStock && (
            <Pressable onPress={() => Linking.openURL(product.affiliateUrl)}
              className="bg-[#0F0F10] py-4 rounded-2xl flex-row items-center justify-center gap-2 mb-5">
              <ExternalLink size={16} color="#FFD43B" />
              <Text className="text-white font-black text-sm uppercase tracking-wider">Shop Now</Text>
            </Pressable>
          )}

          {/* Tags row */}
          {!isWellnessProduct && (product.occasions?.length > 0 || product.seasons?.length > 0) && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
              <View className="flex-row gap-2">
                {product.occasions?.map(occ => (
                  <View key={occ} className="bg-[#7D2AE8]/10 px-3 py-1.5 rounded-full">
                    <Text className="text-[10px] font-black text-[#7D2AE8] uppercase">{occ}</Text>
                  </View>
                ))}
                {product.seasons?.map(s => (
                  <View key={s} className="bg-[#112133]/5 px-3 py-1.5 rounded-full">
                    <Text className="text-[10px] font-black text-[#112133]/60 uppercase">{s}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Description */}
          {product.description && (
            <View className="border-t border-black/5 pt-4 mb-4">
              <Pressable onPress={() => setDescOpen(v => !v)}
                className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-black text-[#112133] uppercase tracking-wide">Description</Text>
                {descOpen ? <ChevronUp size={15} color="#112133" /> : <ChevronDown size={15} color="#112133" />}
              </Pressable>
              {descOpen && (
                <Text className="text-xs text-[#112133]/70 leading-relaxed">{product.description}</Text>
              )}
            </View>
          )}

          {/* Verdicts table */}
          {!isWellnessProduct && product.verdicts && product.verdicts.length > 0 && (
            <View className="border-t border-black/5 pt-4">
              <Text className="text-sm font-black text-[#112133] uppercase tracking-wide mb-3">Fit by Height</Text>
              <View className="rounded-2xl overflow-hidden border border-black/5">
                {product.verdicts.map((v, i) => (
                  <View key={v.heightRange ?? i} className={`flex-row items-center justify-between px-4 py-3 ${i % 2 === 0 ? 'bg-[#F9F8F6]' : 'bg-white'}`}>
                    <Text className="text-xs font-bold text-[#112133]">{v.heightRange}</Text>
                    <View className="flex-row items-center gap-2">
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: v.fitRecommendation?.includes('Highly') ? '#22C55E' : isPositiveRecommendation(v.fitRecommendation) ? '#FFD43B' : '#EF4444' }} />
                      <Text className="text-[10px] font-black uppercase text-[#112133]/70">{v.fitRecommendation}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
