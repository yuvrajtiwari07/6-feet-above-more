import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

// The OS hands the OAuth deep link (sixfeetabovemore://auth/callback) here
// because Expo Router treats any incoming link as a navigation target. The
// actual session exchange already happens in signInWithGoogle() via the
// WebBrowser promise, independent of this screen — this just gives the
// handoff a clean landing spot instead of an "Unmatched Route" flash.
export default function AuthCallbackScreen() {
  useEffect(() => {
    const timer = setTimeout(() => router.replace('/(tabs)/profile'), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-[#0F0F10]">
      <ActivityIndicator size="large" color="#FFD43B" />
    </View>
  );
}
