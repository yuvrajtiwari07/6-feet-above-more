// src/supabase.ts
// Supabase client — replaces firebase.ts
// Handles: Google OAuth sign-in/sign-out, session management, realtime (if needed)

import { createClient, User, Session } from '@supabase/supabase-js';

const supabaseUrl  = (import.meta as any).env?.VITE_SUPABASE_URL  as string;
const supabaseAnon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnon) {
  console.error(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment. ' +
    'Add them to your .env file.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnon ?? '', {
  auth: {
    persistSession:   true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ── Auth Helpers ──────────────────────────────────────────

/**
 * Sign in with Google OAuth. Opens a popup/redirect flow via Supabase.
 */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: {
        access_type: 'offline',
        prompt:      'consent',
      },
    },
  });
  if (error) throw error;
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get the current session's access token (for API Authorization headers).
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Get the current authenticated user.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export type { User, Session };
