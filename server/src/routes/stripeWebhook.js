import { Router } from 'express';
import Stripe from 'stripe';
import { pool } from '../db.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// POST /api/stripe/webhook   (mounted with express.raw in index.js)
router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.order_id;

      if (orderId) {
        await pool.query(
          `UPDATE orders
             SET payment_status='paid',
                 status='paid',
                 stripe_payment_intent_id=$1,
                 updated_at=now()
           WHERE id=$2`,
          [session.payment_intent || null, orderId]
        );
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handling error:', err);
    res.status(500).json({ received: false });
  }
});

export default router;
