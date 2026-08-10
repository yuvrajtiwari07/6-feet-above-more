import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, User, Ruler } from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp } from '../../lib/context/AppContext';

const HEIGHT_OPTIONS = ["6'0", "6'1", "6'2", "6'3", "6'4", "6'5", "6'6+"];

const pressFeedback = ({ pressed }: { pressed: boolean }) => (pressed ? { opacity: 0.7 } : undefined);
const RIPPLE = { color: 'rgba(0,0,0,0.1)' };

export const Header: React.FC = () => {
  const { height, setHeight, savedProductIds, user } = useApp();

  return (
    <SafeAreaView edges={['top']} className="bg-white border-b border-black/10">
      <View className="flex-row items-center justify-between px-4 py-3">
        {/* Logo */}
        <Pressable onPress={() => router.replace('/(tabs)')} android_ripple={RIPPLE} style={pressFeedback} hitSlop={8}>
          <Text className="text-base font-black text-black uppercase tracking-tight">
            6FT <Text className="text-[#FFD43B]">&</Text> Above
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

      {/* Height selector rail */}
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
    </SafeAreaView>
  );
};
