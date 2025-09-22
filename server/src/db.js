import pg from 'pg';
const { Pool } = pg;

import { CONFIG } from './config.js';

// If you use a managed Postgres in prod that requires SSL,
// keep the conditional below. For local dev it's false.
const ssl =
  CONFIG.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false;

export const pool = new Pool({
  connectionString: CONFIG.DATABASE_URL,
  ssl,
});

// (Optional) small helper
export const query = (text, params) => pool.query(text, params);
