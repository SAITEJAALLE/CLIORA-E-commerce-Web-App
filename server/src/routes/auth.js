import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { signAccess, signRefresh, verifyToken } from '../utils/jwt.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

/** default role must match your Postgres enum (user_role) */
const DEFAULT_ROLE = 'customer';  

/** normalize email */
function normEmail(v = '') {
  return String(v).trim().toLowerCase();
}

/**
 * POST /api/auth/register
 * body: { name, email, password }
 */
router.post('/register', async (req, res) => {
  try {
    const name = (req.body?.name || '').trim();
    const email = normEmail(req.body?.email);
    const password = req.body?.password || '';

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing name, email, or password' });
    }

    // ensure unique email
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(email)=LOWER($1)',
      [email]
    );
    if (existing.rows[0]) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);

    // IMPORTANT: role value must exist in enum (admin/customer)
    const ins = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, hash, DEFAULT_ROLE]
    );

    const user = ins.rows[0];

    const access = signAccess({ id: user.id, role: user.role, email: user.email });
    const refresh = signRefresh({ id: user.id });

    await pool.query(
      `INSERT INTO refresh_tokens(user_id, token, revoked, expires_at)
       VALUES ($1, $2, false, now() + interval '7 days')`,
      [user.id, refresh]
    );

    res.cookie('refresh_token', refresh, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // set true in production with HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      token: access,
      user, // { id, name, email, role }
    });
  } catch (err) {
    console.error('POST /register error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const email = normEmail(req.body?.email);
    const password = req.body?.password || '';
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing email or password' });
    }

    const q = await pool.query('SELECT * FROM users WHERE LOWER(email)=LOWER($1)', [email]);
    const user = q.rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const access = signAccess({ id: user.id, role: user.role, email: user.email });
    const refresh = signRefresh({ id: user.id });

    await pool.query(
      `INSERT INTO refresh_tokens(user_id, token, revoked, expires_at)
       VALUES ($1, $2, false, now() + interval '7 days')`,
      [user.id, refresh]
    );

    res.cookie('refresh_token', refresh, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // true in production + HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token: access,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('POST /login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

/**
 * POST /api/auth/refresh
 * uses httpOnly cookie refresh_token
 * returns: { token }
 */
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ message: 'Missing refresh token' });

    const decoded = verifyToken(token);

    const rt = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token=$1 AND revoked=false AND expires_at > now()',
      [token]
    );
    if (!rt.rows[0]) return res.status(401).json({ message: 'Invalid refresh' });

    const ures = await pool.query('SELECT id, role, email FROM users WHERE id=$1', [decoded.id]);
    const user = ures.rows[0];
    if (!user) return res.status(401).json({ message: 'User not found' });

    // include role + email in the new access token
    const access = signAccess({ id: user.id, role: user.role, email: user.email });
    res.json({ token: access });
  } catch (err) {
    console.error('POST /refresh error:', err);
    res.status(401).json({ message: 'Invalid refresh' });
  }
});

/**
 * POST /api/auth/logout
 * clears cookie + revokes server-side token
 */
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      await pool.query('UPDATE refresh_tokens SET revoked=true WHERE token=$1', [token]);
    }
    res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'lax', secure: false });
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /logout error:', err);
    res.json({ ok: true });
  }
});

/**
 * GET /api/auth/me
 * returns user profile (requires Authorization header)
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, name, email, role FROM users WHERE id=$1', [req.user.id]);
    res.json(r.rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

/** Google OAuth placeholders (not wired) */
router.get('/google', (_req, res) => res.status(501).send('Google OAuth not configured'));
router.get('/google/callback', (_req, res) => res.status(501).send('Google OAuth not configured'));

export default router;
