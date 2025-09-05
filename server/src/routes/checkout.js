import { Router } from 'express';
import Stripe from 'stripe';
import { pool } from '../db.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// POST /api/checkout/session
// body: { address: { name, email, line1, city, postal_code }, items: [{id, qty}] }
router.post('/session', async (req, res) => {
  try {
    const { address, items } = req.body || {};
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'No items' });
    }

    // server-trust: fetch product prices by ids
    const ids = items.map(i => i.id);
    const { rows: prods } = await pool.query(
      'SELECT id, name, price_cents, currency FROM products WHERE id = ANY($1::uuid[])',
      [ids]
    );

    // make a quick map for lookups
    const map = new Map(prods.map(p => [p.id, p]));
    let total_cents = 0;
    const line_items = [];

    for (const it of items) {
      const p = map.get(it.id);
      if (!p) return res.status(400).json({ message: 'Invalid item in cart' });
      const qty = Math.max(1, Number(it.qty || 1));
      total_cents += Number(p.price_cents) * qty;

      line_items.push({
        price_data: {
          currency: (p.currency || 'GBP').toLowerCase(),
          product_data: { name: p.name },
          unit_amount: Number(p.price_cents),
        },
        quantity: qty,
      });
    }

    // create order (pending)
    const ordIns = await pool.query(
      `INSERT INTO orders (user_id, status, payment_status, total_cents, currency, name, email, address_line1, city, postal_code)
       VALUES (NULL, 'pending', 'pending', $1, 'GBP', $2, $3, $4, $5, $6)
       RETURNING id`,
      [ total_cents, address?.name || null, address?.email || null, address?.line1 || null, address?.city || null, address?.postal_code || null ]
    );
    const orderId = ordIns.rows[0].id;

    // order_items
    const values = [];
    const params = [];
    let idx = 1;
    for (const it of items) {
      const p = map.get(it.id);
      const qty = Math.max(1, Number(it.qty || 1));
      values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      params.push(orderId, p.id, qty, p.price_cents);
    }
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity, price_cents) VALUES ${values.join(',')}`,
      params
    );

    // Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      success_url: `${process.env.FRONTEND_URL}/checkout?success=1&order=${orderId}`,
      cancel_url:  `${process.env.FRONTEND_URL}/checkout?canceled=1&order=${orderId}`,
      metadata: { order_id: orderId },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('POST /checkout/session error:', err);
    res.status(500).json({ message: 'Could not start checkout' });
  }
});

export default router;
