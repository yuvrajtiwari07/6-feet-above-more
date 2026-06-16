// src/middleware/authMiddleware.ts
// Verifies Supabase JWT from the Authorization header
// Attaches user info to req.user

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Admin email whitelist — same as previous setup
const ADMIN_EMAILS = [
  'ytiwari@argusoft.com',
  'yuvrajtiwari0710@gmail.com',
];

export interface AuthUser {
  uid: string;
  email: string;
  isAdmin: boolean;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Optional auth middleware — attaches user if token present but doesn't block.
 * Use this for public GET routes that benefit from knowing who's asking.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.slice(7);
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data.user) {
      req.user = {
        uid: data.user.id,
        email: data.user.email ?? '',
        isAdmin: ADMIN_EMAILS.includes(data.user.email ?? ''),
      };
    }
  } catch {
    // Non-fatal — just proceed without user
  }
  next();
}

/**
 * Required auth middleware — returns 401 if no valid token.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = {
      uid: data.user.id,
      email: data.user.email ?? '',
      isAdmin: ADMIN_EMAILS.includes(data.user.email ?? ''),
    };
    next();
  } catch (err) {
    console.error('[Auth] Token verification failed:', err);
    return res.status(401).json({ error: 'Token verification failed' });
  }
}
