import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';

const router = Router();

/**
 * GET /api/orders/me
 * Retrieve the authenticated user's orders including items. Orders
 * are sorted newest first.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const ordersRes = await pool.query(
      'SELECT id, status, payment_status, total_cents, vat_rate, created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    const orders = ordersRes.rows;
    // For each order fetch items
    for (const order of orders) {
      const itemsRes = await pool.query(
        `SELECT oi.quantity, oi.unit_price_cents, p.id AS product_id, p.name, p.slug,
                (SELECT path FROM product_images i WHERE i.product_id=p.id AND is_primary=true LIMIT 1) AS image
         FROM order_items oi
         JOIN products p ON oi.product_id=p.id
         WHERE oi.order_id=$1`,
        [order.id]
      );
      order.items = itemsRes.rows;
    }
    return res.json({ orders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching orders' });
  }
});

/**
 * GET /api/orders
 * Admin endpoint to list all orders. Returns summary information.
 */
router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const resOrders = await pool.query(
      `SELECT o.id, o.user_id, o.status, o.payment_status, o.total_cents, o.created_at, u.email
       FROM orders o
       JOIN users u ON o.user_id=u.id
       ORDER BY o.created_at DESC`
    );
    return res.json({ orders: resOrders.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching orders' });
  }
});

/**
 * PATCH /api/orders/:id
 * Admin endpoint to update an order's status or payment_status. Expects
 * JSON body with fields to update. Only supplied fields are updated.
 */
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body || {};
    const fields = [];
    const values = [];
    let idx = 1;
    if (status) {
      fields.push(`status=$${idx++}`);
      values.push(status);
    }
    if (payment_status) {
      fields.push(`payment_status=$${idx++}`);
      values.push(payment_status);
    }
    if (!fields.length) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    values.push(id);
    await pool.query(
      `UPDATE orders SET ${fields.join(', ')} WHERE id=$${idx}`,
      values
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error updating order' });
  }
});

export default router;