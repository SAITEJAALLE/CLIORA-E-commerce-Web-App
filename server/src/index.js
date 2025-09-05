// server/src/index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import bodyParser from 'body-parser';

import { CONFIG } from './config.js';

// routes
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import ordersRoutes from './routes/orders.js';
import checkoutRoutes from './routes/checkout.js';
import stripeWebhookRoute from './routes/stripeWebhook.js';

const app = express();

// Security + CORS
app.use(helmet());
app.use(cors({ origin: CONFIG.FRONTEND_URL, credentials: true }));

// ---------- Stripe webhook must see raw body BEFORE json/urlencoded ----------
app.post('/api/stripe/webhook', bodyParser.raw({ type: 'application/json' }), stripeWebhookRoute);

// Normal parsers for the rest
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Static files
app.use('/uploads', express.static('uploads'));

// API routers
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/checkout', checkoutRoutes);

// Health route
app.get('/', (_req, res) => {
  res.send('Cliora API OK');
});

app.listen(CONFIG.PORT, () => {
  console.log(`Server on :${CONFIG.PORT}`);
});
