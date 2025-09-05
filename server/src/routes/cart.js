import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

/**
 * Ensure a cart exists for the given user. Returns the cart id.
 */
async function ensureCart(userId) {
  const existing = await pool.query('SELECT id FROM carts WHERE user_id=$1', [userId]);
  let cartId;
  if (existing.rows[0]) {
    cartId = existing.rows[0].id;
  } else {
    const res = await pool.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
    cartId = res.rows[0].id;
  }
  return cartId;
}

/**
 * GET /api/cart
 * Returns the current user's cart with items and product details. If
 * no cart exists an empty list is returned.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const cartRes = await pool.query('SELECT id FROM carts WHERE user_id=$1', [req.user.id]);
    if (!cartRes.rows[0]) {
      return res.json({ items: [] });
    }
    const cartId = cartRes.rows[0].id;
    const itemsRes = await pool.query(
      `SELECT ci.id, ci.quantity, ci.unit_price_cents, p.id AS product_id, p.name, p.slug, p.price_cents, p.currency,
              (SELECT path FROM product_images i WHERE i.product_id=p.id AND is_primary=true LIMIT 1) AS image
       FROM cart_items ci
       JOIN products p ON ci.product_id=p.id
       WHERE ci.cart_id=$1`,
      [cartId]
    );
    return res.json({ items: itemsRes.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching cart' });
  }
});

/**
 * POST /api/cart
 * Updates the user's cart with an array of items. Each item should
 * include product_id and quantity. The server calculates unit prices
 * from the products table to prevent tampering. Existing cart items
 * are replaced with the new list.
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items should be an array' });
    }
    const userId = req.user.id;
    const cartId = await ensureCart(userId);
    // Clear existing items
    await pool.query('DELETE FROM cart_items WHERE cart_id=$1', [cartId]);
    // Insert new items
    for (const item of items) {
      const { product_id, quantity } = item;
      const qty = parseInt(quantity, 10);
      if (!product_id || Number.isNaN(qty) || qty <= 0) continue;
      const productRes = await pool.query('SELECT price_cents FROM products WHERE id=$1', [product_id]);
      const product = productRes.rows[0];
      if (!product) continue;
      await pool.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity, unit_price_cents) VALUES ($1,$2,$3,$4)',
        [cartId, product_id, qty, product.price_cents]
      );
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error updating cart' });
  }
});

export default router;