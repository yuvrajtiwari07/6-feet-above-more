import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../lib/context/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="category/[name]" options={{ headerShown: false }} />
        <Stack.Screen name="catalog/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="catalog-category/[name]" options={{ headerShown: false }} />
        <Stack.Screen name="complete-fits" options={{ headerShown: false }} />
        <Stack.Screen name="fit-finder" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="admin/catalogs" options={{ headerShown: false }} />
        <Stack.Screen name="admin/catalog-form" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="admin/catalog-categories" options={{ headerShown: false }} />
        <Stack.Screen name="admin/bulk-import" options={{ headerShown: false }} />
        <Stack.Screen name="admin/product-form" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </AppProvider>
  );
}
