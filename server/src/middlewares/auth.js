import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware to enforce that a request carries a valid access token.
 * Tokens are expected in the Authorization header using the
 * "Bearer <token>" format. On success the decoded token is
 * attached to req.user. On failure a 401 response is returned.
 */
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}