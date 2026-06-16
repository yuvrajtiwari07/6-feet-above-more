// src/controllers/userController.ts
// Express route handlers for /api/users

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { userRepository } from '../repositories/userRepository';

const router = Router();

// ───────────────────────────────────────────────
//  GET /api/users/profile
//  Authenticated — get own profile
// ───────────────────────────────────────────────
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await userRepository.findByUserId(req.user!.uid);
    if (!profile) {
      // First time — create a blank profile
      const created = await userRepository.upsert(
        req.user!.uid,
        req.user!.email,
        {}
      );
      return res.json({ success: true, profile: created });
    }
    res.json({ success: true, profile });
  } catch (err: any) {
    console.error('[UserController] GET /profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ───────────────────────────────────────────────
//  PUT /api/users/profile
//  Authenticated — update own profile fields
// ───────────────────────────────────────────────
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const allowedFields = [
      'height', 'bodyType', 'cardSize',
      'savedProductIds', 'savedFitIds', 'preferences',
    ];

    // Strip any fields not in allowlist
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in req.body) {
        updates[field] = req.body[field];
      }
    }

    // Ensure profile exists first (upsert)
    await userRepository.upsert(req.user!.uid, req.user!.email, {});

    const profile = await userRepository.updateProfile(req.user!.uid, updates);
    res.json({ success: true, profile });
  } catch (err: any) {
    console.error('[UserController] PUT /profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
