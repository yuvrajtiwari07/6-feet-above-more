// src/middleware/adminMiddleware.ts
// Blocks non-admins from mutating operations with HTTP 403

import { Request, Response, NextFunction } from 'express';

/**
 * Must be used AFTER requireAuth.
 * Returns 403 if the authenticated user is not an admin.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({
      error: 'Forbidden: Admin privileges required for this operation',
      hint: 'Only whitelisted admin accounts can create, update, or delete products.',
    });
  }
  next();
}
