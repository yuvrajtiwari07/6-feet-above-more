import React, { useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, Dimensions, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Heart, ExternalLink, CheckCircle2, Ruler, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { MotiView } from 'moti';
import { router } from 'expo-router';
import { Product } from '../../lib/types';
import { useApp } from '../../lib/context/AppContext';
import { getProductRecommendation, isPositiveRecommendation } from '../../lib/utils/fitEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const pressFeedback = ({ pressed }: { pressed: boolean }) => (pressed ? { opacity: 0.75 } : undefined);
const RIPPLE_DARK  = { color: 'rgba(0,0,0,0.1)' };
const RIPPLE_LIGHT = { color: 'rgba(255,255,255,0.25)' };

interface ProductCardProps {
  product: Product;
  cardWidth?: number;
}

export const ProductCard = React.memo(({ product, cardWidth }: ProductCardProps) => {
  const { height, bodyType, toggleSaveProduct, savedProductIds, trackAffiliateClick, cardSize } = useApp();
  const isSaved = savedProductIds.includes(product.id);
  const isSm = cardSize === 'small';
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const isWellnessProduct = (product.vertical ?? 'fashion') === 'wellness';
  const recommendation = isWellnessProduct
    ? null
    : getProductRecommendation(product.verdicts, height, bodyType);

  const handleShop = () => {
    trackAffiliateClick(product.id, product.retailer, product.affiliateUrl);
    Linking.openURL(product.affiliateUrl);
  };

  const renderBadge = () => {
    if (isWellnessProduct) {
      const label = product.dietTags?.[0] || product.form || product.productType || 'Wellness';
      return (
        <View className={`flex-row items-center gap-1 rounded-full ${isSm ? 'px-2 py-0.5' : 'px-3 py-1'}`} style={{ backgroundColor: '#0E7C5A' }}>
          <Text className={`text-white font-black uppercase tracking-wider ${isSm ? 'text-[8px]' : 'text-[9px]'}`}>{label}</Text>
        </View>
      );
    }
    if (!recommendation) {
      return (
        <View className={`flex-row items-center gap-1 bg-black rounded-full ${isSm ? 'px-2 py-0.5' : 'px-3 py-1'}`}>
          <Text className={`text-white font-black uppercase tracking-wider ${isSm ? 'text-[8px]' : 'text-[9px]'}`}>TALL FRIENDLY</Text>
        </View>
      );
    }
    const rec = recommendation.fitRecommendation.toUpperCase();
    const isPositive = isPositiveRecommendation(recommendation.fitRecommendation);
    const bgColor = rec.includes('HIGHLY RECOMMENDED') ? '#FFD43B' : isPositive ? '#00C4CC' : '#f59e0b';
    const textColor = rec.includes('HIGHLY RECOMMENDED') ? '#000' : '#fff';
    return (
      <View className={`flex-row items-center gap-1 rounded-full ${isSm ? 'px-2 py-0.5' : 'px-3 py-1'}`} style={{ backgroundColor: bgColor }}>
        {isPositive
          ? <CheckCircle2 size={isSm ? 9 : 11} color={textColor} strokeWidth={2.5} />
          : <Ruler size={isSm ? 9 : 11} color={textColor} />}
        <Text className={`font-black uppercase tracking-wider ${isSm ? 'text-[8px]' : 'text-[9px]'}`} style={{ color: textColor }}>{rec}</Text>
      </View>
    );
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
      className={`bg-white border border-black/10 overflow-hidden ${isSm ? 'rounded-xl' : 'rounded-[24px]'}`}
    >
      {/* Image carousel */}
      <Pressable onPress={() => router.push(`/product/${product.id}`)} className="aspect-[3/4] relative"
        android_ripple={RIPPLE_DARK} style={pressFeedback}>
        <FlatList
          ref={flatRef}
          data={product.images?.length ? product.images : [null]}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / (cardWidth ?? SCREEN_WIDTH));
            setActiveIndex(idx);
          }}
          renderItem={({ item }) => (
            <Image
              source={item ?? 'https://placehold.co/400x533/F5F5F5/999999?text=No+Image'}
              style={{ width: cardWidth ?? SCREEN_WIDTH, aspectRatio: 3 / 4 }}
              contentFit="cover"
              transition={200}
            />
          )}
        />

        {/* Gradient overlay */}
        <View className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />

        {/* Fit badge */}
        <View className={`absolute ${isSm ? 'top-2 left-2' : 'top-3 left-3'}`}>{renderBadge()}</View>

        {/* Save button */}
        <Pressable
          onPress={() => toggleSaveProduct(product.id)}
          className={`absolute ${isSm ? 'top-2 right-2 p-1.5' : 'top-3 right-3 p-2.5'} bg-white rounded-full border border-black/10`}
          android_ripple={{ ...RIPPLE_DARK, radius: isSm ? 16 : 22 }} style={pressFeedback} hitSlop={6}
        >
          <Heart size={isSm ? 12 : 15} color={isSaved ? '#FFD43B' : '#000'} fill={isSaved ? '#FFD43B' : 'none'} />
        </Pressable>

        {/* Retailer sticker */}
        <View className={`absolute ${isSm ? 'bottom-2 left-2' : 'bottom-3 left-3'}`}>
          <View className={`bg-[#FFCC00] border border-black/15 rounded ${isSm ? 'px-2 py-0.5' : 'px-3 py-1'}`}>
            <Text className={`font-black text-black uppercase tracking-widest ${isSm ? 'text-[8px]' : 'text-[10px]'}`}>{product.retailer}</Text>
          </View>
        </View>

        {/* Image navigation arrows — only if >1 image */}
        {product.images?.length > 1 && (
          <>
            <Pressable
              onPress={() => { const prev = Math.max(0, activeIndex - 1); flatRef.current?.scrollToIndex({ index: prev, animated: true }); setActiveIndex(prev); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/85 rounded-full p-1 border border-black/10"
              android_ripple={{ ...RIPPLE_DARK, radius: 14 }} style={pressFeedback} hitSlop={6}
            >
              <ChevronLeft size={14} color="#000" />
            </Pressable>
            <Pressable
              onPress={() => { const next = Math.min(product.images.length - 1, activeIndex + 1); flatRef.current?.scrollToIndex({ index: next, animated: true }); setActiveIndex(next); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/85 rounded-full p-1 border border-black/10"
              android_ripple={{ ...RIPPLE_DARK, radius: 14 }} style={pressFeedback} hitSlop={6}
            >
              <ChevronRight size={14} color="#000" />
            </Pressable>
          </>
        )}
      </Pressable>

      {/* Text block */}
      <View className={`${isSm ? 'p-3' : 'p-5'} flex-1`}>
        <View className={`flex-row items-center justify-between ${isSm ? 'mb-1' : 'mb-2'}`}>
          <Text className={`text-black font-black uppercase tracking-wider ${isSm ? 'text-[10px]' : 'text-[12px]'}`}>{product.brand}</Text>
          <View className="bg-black rounded px-1.5 py-0.5">
            <Text className={`text-white font-bold uppercase ${isSm ? 'text-[8px]' : 'text-[10px]'}`}>
              {isWellnessProduct ? (product.netQuantity || product.form || product.productType) : product.fitType}
            </Text>
          </View>
        </View>

        <Text className={`text-black font-black ${isSm ? 'text-xs mb-1.5' : 'text-sm mb-2'}`} numberOfLines={1}>{product.title}</Text>

        {/* Pricing — real retailer price only, no invented MRP/discount */}
        <View className={isSm ? 'mb-2' : 'mb-3'}>
          <View className="flex-row items-baseline gap-1.5">
            <Text className={`font-black text-black ${isSm ? 'text-sm' : 'text-lg'}`}>₹{product.priceAtRetailer.toLocaleString('en-IN')}</Text>
          </View>
          {!!product.couponCode && (
            <View className={`flex-row items-center justify-between bg-[#0E7C5A]/10 border border-[#0E7C5A]/20 rounded ${isSm ? 'px-1 py-0.5 mt-0.5' : 'px-2 py-1'}`}>
              <Text className={`text-[#0E7C5A] font-black uppercase ${isSm ? 'text-[8px]' : 'text-[10px]'}`}>Code:</Text>
              <Text className={`text-black font-bold ${isSm ? 'text-[9px]' : 'text-[11px]'}`}>{product.couponCode}</Text>
            </View>
          )}
        </View>

        {/* Verdict strip */}
        <View className={`bg-[#FAF9F6] border border-black/5 ${isSm ? 'rounded-lg p-1.5 mb-2' : 'rounded-xl p-3 mb-3'}`}>
          <Text className={`text-[#D5A021] font-black ${isSm ? 'text-[8px]' : 'text-[9px]'} mb-0.5`}>{height} TALL VERDICT</Text>
          <Text className={`text-black/70 ${isSm ? 'text-[9px]' : 'text-xs'}`} numberOfLines={isSm ? 1 : 2}>
            {recommendation ? `Verified as ${recommendation.fitRecommendation} for your profile.` : 'Optimized torso length & wide shoulder-cuts.'}
          </Text>
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-1.5">
          <Pressable
            onPress={() => router.push(`/product/${product.id}`)}
            className={`flex-[2] items-center justify-center bg-[#F5F5F7] border border-black/10 rounded-lg ${isSm ? 'py-1.5' : 'py-3'}`}
            android_ripple={RIPPLE_DARK} style={pressFeedback}
          >
            <Text className={`text-black font-black uppercase tracking-wider ${isSm ? 'text-[9px]' : 'text-xs'}`}>Sizing</Text>
          </Pressable>
          <Pressable
            onPress={handleShop}
            className={`flex-[3] flex-row items-center justify-center gap-0.5 bg-black rounded-xl ${isSm ? 'py-1.5' : 'py-3'}`}
            android_ripple={RIPPLE_LIGHT} style={pressFeedback}
          >
            <Text className={`text-white font-black uppercase ${isSm ? 'text-[9px]' : 'text-xs'}`}>Shop</Text>
            <ExternalLink size={isSm ? 8 : 10} color="#fff" />
          </Pressable>
        </View>
      </View>
    </MotiView>
  );
});

export const ProductCardSkeleton = ({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) => {
  const isSm = size === 'small';
  return (
    <MotiView
      from={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 700, loop: true }}
      className={`bg-white border border-black/10 overflow-hidden ${isSm ? 'rounded-xl' : 'rounded-[24px]'}`}
    >
      <View className="aspect-[3/4] bg-neutral-200" />
      <View className={`${isSm ? 'p-3' : 'p-5'} gap-2`}>
        <View className="flex-row justify-between">
          <View className="h-3 w-20 bg-neutral-200 rounded" />
          <View className="h-3 w-14 bg-neutral-200 rounded" />
        </View>
        <View className="h-4 w-full bg-neutral-200 rounded" />
        <View className="h-4 w-3/4 bg-neutral-200 rounded" />
        <View className="h-10 w-full bg-neutral-100 rounded-lg" />
        <View className="flex-row gap-1.5">
          <View className={`flex-[2] ${isSm ? 'h-7' : 'h-10'} bg-neutral-200 rounded-lg`} />
          <View className={`flex-[3] ${isSm ? 'h-7' : 'h-10'} bg-neutral-200 rounded-xl`} />
        </View>
      </View>
    </MotiView>
  );
};
