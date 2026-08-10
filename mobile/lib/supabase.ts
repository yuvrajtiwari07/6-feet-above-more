import { createClient, User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// Read from Expo's env (use .env with EXPO_PUBLIC_ prefix)
const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnon) {
  console.error('[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage:            AsyncStorage,  // persist session in AsyncStorage instead of localStorage
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: false,         // disable web hash-based session detection
  },
});

// ── Auth Helpers ──────────────────────────────────────────

export async function signInWithGoogle(): Promise<void> {
  const redirectTo = Linking.createURL('/auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { access_type: 'offline', prompt: 'consent' },
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('[Supabase] No OAuth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;

  const { url } = result;
  const queryPart = url.split('#')[0].split('?')[1] ?? '';
  const hashPart  = url.split('#')[1] ?? '';
  const queryParams = new URLSearchParams(queryPart);
  const hashParams  = new URLSearchParams(hashPart);

  // Supabase JS defaults to the PKCE flow, which returns `?code=...` — the
  // verifier was stashed in AsyncStorage by signInWithOAuth() above, so
  // exchangeCodeForSession can complete the handshake from just the code.
  const code = queryParams.get('code');
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return;
  }

  // Fallback: implicit flow, tokens arrive directly in the URL fragment.
  const accessToken  = hashParams.get('access_token') ?? queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') ?? queryParams.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error: setSessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (setSessionError) throw setSessionError;
    return;
  }

  const errorDescription = queryParams.get('error_description') ?? hashParams.get('error_description');
  if (errorDescription) throw new Error(errorDescription);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export type { User, Session };
