import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, LogOut, ChevronRight, Edit3, Check, ShieldCheck } from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp } from '../../lib/context/AppContext';

const HEIGHT_OPTIONS = ["6'0", "6'1", "6'2", "6'3", "6'4", "6'5", "6'6+"];
const BODY_TYPES = ['Athletic', 'Lean', 'Broad', 'Heavy'] as const;

export default function ProfileScreen() {
  const { user, logout, loginWithGoogle, isAdmin, height, setHeight, bodyType, setBodyType, savedProductIds } = useApp();
  const [editingHeight, setEditingHeight] = useState(false);
  const [editingBody,   setEditingBody]   = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await loginWithGoogle();
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message ?? 'Something went wrong.');
    } finally {
      setSigningIn(false);
    }
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

        {/* Admin access */}
        {user && isAdmin && (
          <View className="mx-4 mt-4 bg-[#7D2AE8]/10 border border-[#7D2AE8]/20 rounded-3xl p-5">
            <View className="flex-row items-center gap-2 mb-1.5">
              <View className="w-2 h-2 bg-[#7D2AE8] rounded-full" />
              <Text className="text-xs font-black uppercase tracking-wider text-[#7D2AE8]">Admin Privileges Unlocked</Text>
            </View>
            <Text className="text-xs text-[#112133]/70 leading-relaxed mb-4">
              You're signed in as an administrator. Add, edit, or remove products, manage catalogs, and toggle stock.
            </Text>
            <Pressable onPress={() => router.push('/admin')}
              android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
              className="flex-row items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#7D2AE8]">
              <ShieldCheck size={15} color="#fff" />
              <Text className="text-xs font-black uppercase tracking-wider text-white">Enter Admin Panel</Text>
            </Pressable>
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
            <Pressable onPress={handleSignIn} disabled={signingIn}
              android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
              style={({ pressed }) => (pressed ? { opacity: 0.8 } : undefined)}
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-[#7D2AE8]">
              {signingIn ? <ActivityIndicator size="small" color="#fff" /> : <User size={16} color="#fff" />}
              <Text className="text-sm font-black uppercase tracking-wider text-white">
                {signingIn ? 'Signing in...' : 'Sign In with Google'}
              </Text>
            </Pressable>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
