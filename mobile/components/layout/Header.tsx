import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, User, Ruler, Shirt, Leaf } from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp } from '../../lib/context/AppContext';
import { Vertical } from '../../lib/types';

const HEIGHT_OPTIONS = ["6'0", "6'1", "6'2", "6'3", "6'4", "6'5", "6'6+"];

const pressFeedback = ({ pressed }: { pressed: boolean }) => (pressed ? { opacity: 0.7 } : undefined);
const RIPPLE = { color: 'rgba(0,0,0,0.1)' };

const VERTICALS: { key: Vertical; label: string; sub: string; bg: string; fg: string }[] = [
  { key: 'fashion',  label: 'Fashion',  sub: '6ft & above',  bg: '#FFD43B', fg: '#000000' },
  { key: 'wellness', label: 'Nutrition & Health', sub: 'for everyone', bg: '#0E7C5A', fg: '#FFFFFF' },
];

export const Header: React.FC = () => {
  const { height, setHeight, savedProductIds, vertical, setVertical, isWellness } = useApp();

  const handleSwitch = (v: Vertical) => {
    if (v === vertical) return;
    setVertical(v);
    // Taxonomies do not overlap — always land back on the home tab.
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView edges={['top']} className="bg-white border-b border-black/10">
      {/* Storefront switcher — swaps the whole catalogue */}
      <View className="flex-row items-center gap-2 px-4 pt-2 pb-1">
        {VERTICALS.map(v => {
          const isActive = vertical === v.key;
          const Icon = v.key === 'wellness' ? Leaf : Shirt;
          return (
            <Pressable
              key={v.key}
              onPress={() => handleSwitch(v.key)}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-2 py-2 border-2"
              style={{
                backgroundColor: isActive ? v.bg : '#11213308',
                borderColor: isActive ? '#000000' : 'transparent',
              }}
              android_ripple={RIPPLE}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Icon size={13} color={isActive ? v.fg : '#11213366'} />
              <Text
                className="text-[10px] font-black uppercase tracking-wider"
                style={{ color: isActive ? v.fg : '#11213380' }}
                numberOfLines={1}
              >
                {v.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row items-center justify-between px-4 py-2">
        {/* Logo */}
        <Pressable onPress={() => router.replace('/(tabs)')} android_ripple={RIPPLE} style={pressFeedback} hitSlop={8}>
          <Text className="text-base font-black text-black uppercase tracking-tight">
            6FT <Text className="text-[#FFD43B]">&</Text> Above
          </Text>
          <Text className="text-[8px] font-black uppercase tracking-widest text-black/35 mt-0.5">
            {isWellness ? 'Nutrition, skin & health' : 'Clothes that finally fit'}
          </Text>
        </Pressable>

        {/* Right actions */}
        <View className="flex-row items-center gap-3">
          {/* Saved count */}
          <Pressable onPress={() => router.push('/(tabs)/saved')} className="relative"
            android_ripple={{ ...RIPPLE, radius: 20 }} style={pressFeedback} hitSlop={8}>
            <Heart size={20} color="#112133" />
            {savedProductIds.length > 0 && (
              <View className="absolute -top-1 -right-1 bg-[#FFD43B] rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-[8px] font-black text-black">{savedProductIds.length}</Text>
              </View>
            )}
          </Pressable>

          {/* Profile */}
          <Pressable onPress={() => router.push('/(tabs)/profile')} className="bg-[#112133]/5 rounded-full p-1.5"
            android_ripple={{ ...RIPPLE, radius: 18 }} style={pressFeedback}>
            <User size={18} color="#112133" />
          </Pressable>
        </View>
      </View>

      {/* Height selector rail — fashion only, wellness has no height gate */}
      {!isWellness && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-3">
          <View className="flex-row items-center gap-1 bg-[#112133]/5 rounded-full p-1">
            <Ruler size={13} color="#7D2AE8" style={{ marginLeft: 6 }} />
            {HEIGHT_OPTIONS.map(h => (
              <Pressable
                key={h}
                onPress={() => setHeight(h)}
                className={`px-3 py-1.5 rounded-full ${h === height ? 'bg-[#7D2AE8]' : ''}`}
                android_ripple={RIPPLE} style={pressFeedback}
              >
                <Text className={`text-xs font-black ${h === height ? 'text-white' : 'text-[#112133]/70'}`}>{h}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
