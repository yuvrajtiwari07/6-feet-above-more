import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, LogOut, ChevronRight, Edit3, Check } from 'lucide-react-native';
import { useApp } from '../../lib/context/AppContext';

const HEIGHT_OPTIONS = ["6'0", "6'1", "6'2", "6'3", "6'4", "6'5", "6'6+"];
const BODY_TYPES = ['Athletic', 'Lean', 'Broad', 'Heavy'] as const;

export default function ProfileScreen() {
  const { user, logout, height, setHeight, bodyType, setBodyType, savedProductIds } = useApp();
  const [editingHeight, setEditingHeight] = useState(false);
  const [editingBody,   setEditingBody]   = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View className="bg-[#0F0F10] px-6 pt-8 pb-10">
          <View className="w-20 h-20 rounded-full bg-[#FFD43B] items-center justify-center mb-4 border-2 border-white/10">
            <User size={36} color="#000" />
          </View>
          {user ? (
            <>
              <Text className="text-white font-black text-2xl uppercase tracking-tight">
                {user.user_metadata?.full_name ?? 'Tall & Styled'}
              </Text>
              <Text className="text-white/50 text-xs font-medium mt-1">{user.email}</Text>
            </>
          ) : (
            <>
              <Text className="text-white font-black text-2xl uppercase tracking-tight">Guest</Text>
              <Text className="text-white/50 text-xs font-medium mt-1">Sign in to sync your profile</Text>
            </>
          )}
          <View className="flex-row gap-4 mt-5">
            <View className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/10">
              <Text className="text-[#FFD43B] font-black text-xl">{savedProductIds.length}</Text>
              <Text className="text-white/50 text-[10px] font-bold uppercase tracking-widest mt-0.5">Saved</Text>
            </View>
            <View className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/10">
              <Text className="text-[#FFD43B] font-black text-sm">{height}</Text>
              <Text className="text-white/50 text-[10px] font-bold uppercase tracking-widest mt-0.5">Height</Text>
            </View>
            <View className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/10">
              <Text className="text-[#FFD43B] font-black text-sm">{bodyType}</Text>
              <Text className="text-white/50 text-[10px] font-bold uppercase tracking-widest mt-0.5">Build</Text>
            </View>
          </View>
        </View>

        {/* Fit Profile */}
        <View className="mx-4 mt-5 bg-white rounded-3xl p-5 border border-black/5">
          <Text className="text-[10px] font-black uppercase tracking-widest text-[#7D2AE8] mb-3">Fit Profile</Text>

          {/* Height */}
          <View className="py-3 border-b border-black/5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-[#112133]/50">Height</Text>
              <Pressable onPress={() => setEditingHeight(v => !v)}>
                {editingHeight ? <Check size={15} color="#7D2AE8" /> : <Edit3 size={15} color="#7D2AE8" />}
              </Pressable>
            </View>
            {editingHeight ? (
              <View className="flex-row flex-wrap gap-2 mt-1">
                {HEIGHT_OPTIONS.map(h => (
                  <Pressable key={h}
                    onPress={() => { setHeight(h); setEditingHeight(false); }}
                    className={`px-3 py-1.5 rounded-xl border ${h === height ? 'bg-[#7D2AE8] border-[#7D2AE8]' : 'border-black/10'}`}>
                    <Text className={`text-xs font-black ${h === height ? 'text-white' : 'text-[#112133]/70'}`}>{h}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text className="text-base font-black text-[#112133]">{height}</Text>
            )}
          </View>

          {/* Body type */}
          <View className="py-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-[#112133]/50">Body Type</Text>
              <Pressable onPress={() => setEditingBody(v => !v)}>
                {editingBody ? <Check size={15} color="#7D2AE8" /> : <Edit3 size={15} color="#7D2AE8" />}
              </Pressable>
            </View>
            {editingBody ? (
              <View className="flex-row gap-2 mt-1">
                {BODY_TYPES.map(bt => (
                  <Pressable key={bt}
                    onPress={() => { setBodyType(bt); setEditingBody(false); }}
                    className={`px-4 py-2 rounded-xl border ${bt === bodyType ? 'bg-[#7D2AE8] border-[#7D2AE8]' : 'border-black/10'}`}>
                    <Text className={`text-xs font-black ${bt === bodyType ? 'text-white' : 'text-[#112133]/70'}`}>{bt}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text className="text-base font-black text-[#112133]">{bodyType}</Text>
            )}
          </View>
        </View>

        {/* Account info */}
        {user && (
          <View className="mx-4 mt-4 bg-white rounded-3xl px-5 py-2 border border-black/5">
            <Text className="text-[10px] font-black uppercase tracking-widest text-[#7D2AE8] pt-3 pb-1">Account</Text>
            <View className="flex-row items-center justify-between py-3.5 border-b border-black/5">
              <Text className="text-xs font-bold uppercase tracking-widest text-[#112133]/50">Email</Text>
              <Text className="text-sm font-black text-[#112133]">{user.email}</Text>
            </View>
            {user.user_metadata?.full_name && (
              <View className="flex-row items-center justify-between py-3.5">
                <Text className="text-xs font-bold uppercase tracking-widest text-[#112133]/50">Name</Text>
                <Text className="text-sm font-black text-[#112133]">{user.user_metadata.full_name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Sign in / out */}
        <View className="mx-4 mt-4 mb-10">
          {user ? (
            <Pressable onPress={handleSignOut}
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-red-50 border border-red-200">
              <LogOut size={16} color="#EF4444" />
              <Text className="text-sm font-black uppercase tracking-wider text-red-500">Sign Out</Text>
            </Pressable>
          ) : (
            <Pressable className="flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-[#7D2AE8]">
              <User size={16} color="#fff" />
              <Text className="text-sm font-black uppercase tracking-wider text-white">Sign In with Google</Text>
            </Pressable>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
