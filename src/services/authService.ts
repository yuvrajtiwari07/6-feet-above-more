// src/services/authService.ts
// Token verification and admin determination — used by middleware

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const ADMIN_EMAILS = [
  'ytiwari@argusoft.com',
  'yuvrajtiwari0710@gmail.com',
];

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }
    _supabaseAdmin = createClient(url, key);
  }
  return _supabaseAdmin;
}

export interface VerifiedUser {
  uid: string;
  email: string;
  isAdmin: boolean;
}

export async function verifyToken(token: string): Promise<VerifiedUser | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;

    return {
      uid:     data.user.id,
      email:   data.user.email ?? '',
      isAdmin: isAdminEmail(data.user.email ?? ''),
    };
  } catch (err) {
    console.error('[AuthService] verifyToken error:', err);
    return null;
  }
}
