// src/repositories/userRepository.ts
// Raw SQL for the users table — profile storage

import { query, queryOne } from '../lib/db';

export interface UserRow {
  id: string;
  userId: string;
  email: string;
  isAdmin: boolean;
  height: string;
  bodyType: string;
  cardSize: string;
  savedProductIds: string[];
  savedFitIds: string[];
  preferences: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

function rowToUser(row: any): UserRow {
  return {
    id:               row.id,
    userId:           row.user_id,
    email:            row.email,
    isAdmin:          row.is_admin,
    height:           row.height,
    bodyType:         row.body_type,
    cardSize:         row.card_size,
    savedProductIds:  row.saved_product_ids ?? [],
    savedFitIds:      row.saved_fit_ids ?? [],
    preferences:      row.preferences ?? {},
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

const ADMIN_EMAILS = [
  'ytiwari@argusoft.com',
  'yuvrajtiwari0710@gmail.com',
];

export const userRepository = {
  async findByUserId(userId: string): Promise<UserRow | null> {
    const row = await queryOne(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
    return row ? rowToUser(row) : null;
  },

  async upsert(
    userId: string,
    email: string,
    data: Partial<Omit<UserRow, 'id' | 'userId' | 'email' | 'isAdmin' | 'createdAt' | 'updatedAt'>>
  ): Promise<UserRow> {
    const isAdmin = ADMIN_EMAILS.includes(email);

    const text = `
      INSERT INTO users (user_id, email, is_admin, height, body_type, card_size, saved_product_ids, saved_fit_ids, preferences)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        email              = EXCLUDED.email,
        is_admin           = $3,
        height             = COALESCE($4, users.height),
        body_type          = COALESCE($5, users.body_type),
        card_size          = COALESCE($6, users.card_size),
        saved_product_ids  = COALESCE($7, users.saved_product_ids),
        saved_fit_ids      = COALESCE($8, users.saved_fit_ids),
        preferences        = COALESCE($9, users.preferences),
        updated_at         = NOW()
      RETURNING *
    `;
    const params = [
      userId,
      email,
      isAdmin,
      data.height ?? null,
      data.bodyType ?? null,
      data.cardSize ?? null,
      data.savedProductIds ?? null,
      data.savedFitIds ?? null,
      data.preferences ? JSON.stringify(data.preferences) : null,
    ];
    const rows = await query(text, params);
    return rowToUser(rows[0]);
  },

  async updateProfile(
    userId: string,
    data: Partial<Omit<UserRow, 'id' | 'userId' | 'email' | 'isAdmin' | 'createdAt' | 'updatedAt'>>
  ): Promise<UserRow | null> {
    const fieldMap: Record<string, string> = {
      height:           'height',
      bodyType:         'body_type',
      cardSize:         'card_size',
      savedProductIds:  'saved_product_ids',
      savedFitIds:      'saved_fit_ids',
      preferences:      'preferences',
    };
    const jsonFields = new Set(['preferences']);

    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in data) {
        const val = (data as any)[key];
        setClauses.push(`${col} = $${idx++}`);
        params.push(jsonFields.has(key) ? JSON.stringify(val) : val);
      }
    }

    if (setClauses.length === 0) return this.findByUserId(userId);

    setClauses.push(`updated_at = NOW()`);
    params.push(userId);

    const text = `UPDATE users SET ${setClauses.join(', ')} WHERE user_id = $${idx} RETURNING *`;
    const rows = await query(text, params);
    return rows.length > 0 ? rowToUser(rows[0]) : null;
  },
};
