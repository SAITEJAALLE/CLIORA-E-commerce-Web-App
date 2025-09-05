import 'dotenv/config';

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  DATABASE_URL: must('DATABASE_URL'),
  JWT_SECRET: must('JWT_SECRET'),
  FRONTEND_URL: must('FRONTEND_URL'),
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  VAT_RATE: parseFloat(process.env.VAT_RATE || '0.2'),
  CURRENCY: process.env.CURRENCY || 'GBP',
};
