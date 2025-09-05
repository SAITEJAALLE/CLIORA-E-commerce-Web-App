// server/src/utils/jwt.js
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.js';

/**
 * Token lifetimes.
 * You can override these with env vars if you want:
 *   ACCESS_TOKEN_MINUTES=15
 *   REFRESH_TOKEN_DAYS=7
 */
const ACCESS_TOKEN_MINUTES = parseInt(process.env.ACCESS_TOKEN_MINUTES || '15', 10);
const REFRESH_TOKEN_DAYS   = parseInt(process.env.REFRESH_TOKEN_DAYS   || '7', 10);

/**
 * Create a short-lived access token (JWT) for API calls.
 * Payload usually includes: { id, role, email }
 */
export function signAccess(payload) {
  return jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn: `${ACCESS_TOKEN_MINUTES}m` });
}

/**
 * Create a longer-lived refresh token (JWT) stored in httpOnly cookie.
 * We also persist it in DB (refresh_tokens) in your auth flow.
 */
export function signRefresh(payload) {
  return jwt.sign(payload, CONFIG.JWT_SECRET, { expiresIn: `${REFRESH_TOKEN_DAYS}d` });
}

/**
 * Verify any JWT (throws if invalid/expired).
 */
export function verifyToken(token) {
  return jwt.verify(token, CONFIG.JWT_SECRET);
}

/**
 * Non-verifying decode (useful for debugging only).
 */
export function decodeToken(token) {
  return jwt.decode(token);
}

/** Optional: export TTLs if you want to show them in logs/UI */
export const TOKEN_TTLS = {
  accessMinutes: ACCESS_TOKEN_MINUTES,
  refreshDays: REFRESH_TOKEN_DAYS,
};
