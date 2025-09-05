import { Router } from 'express';
import multer from 'multer';
import { pool } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';

const router = Router();

/* ---------- Upload config ---------- */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, 'uploads'),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

/**
 * GET /api/products
 * Query: page, q, category, sort(new|price_asc|price_desc)
 * Returns: { items, total, page, pageSize }
 */
router.get('/', async (req, res) => {
  try {
    const pageSize = 12;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const q = (req.query.q || '').trim();
    const category = (req.query.category || '').trim();
    const sort = (req.query.sort || 'new').trim();

    const sortMap = {
      new: 'p.created_at DESC',
      price_asc: 'p.price_cents ASC',
      price_desc: 'p.price_cents DESC'
    };
    const orderBy = sortMap[sort] || sortMap.new;

    const where = [];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      where.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      where.push(`c.slug = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
    `;
    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const offset = (page - 1) * pageSize;
    const itemsSql = `
      SELECT
        p.id, p.name, p.slug, p.description,
        p.price_cents, p.currency, p.category_id,
        c.name AS category_name, c.slug AS category_slug,
        (
          SELECT path FROM product_images i
          WHERE i.product_id = p.id
          ORDER BY is_primary DESC, id ASC
          LIMIT 1
        ) AS image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const itemsRes = await pool.query(itemsSql, [...params, pageSize, offset]);

    res.json({ items: itemsRes.rows, total, page, pageSize });
  } catch (err) {
    console.error('GET /api/products error:', err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

/* ============ Admin: Create / Update / Delete ============ */

/**
 * POST /api/products
 * FormData: name, slug, description, price_cents, currency (GBP), category_id (optional), images[]
 */
router.post('/', requireAuth, requireAdmin, upload.array('images', 4), async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const slug = (req.body.slug || '').trim().toLowerCase();
    const description = (req.body.description || '').trim();
    const currency = (req.body.currency || 'GBP').trim() || 'GBP';

    // Accept "3499" (pence). If someone sends "34.99", convert it.
    let price_cents = req.body.price_cents;
    if (typeof price_cents === 'string' && price_cents.includes('.')) {
      // "34.99" -> 3499
      price_cents = Math.round(parseFloat(price_cents) * 100);
    } else {
      price_cents = Number(price_cents);
    }

    // category is optional
    const category_id = req.body.category_id ? Number(req.body.category_id) : null;

    // basic validations
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!slug) return res.status(400).json({ message: 'Slug is required' });
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ message: 'Slug must be lowercase letters, numbers, or hyphens' });
    }
    if (!Number.isFinite(price_cents) || price_cents < 0) {
      return res.status(400).json({ message: 'Price (in pence) is invalid' });
    }

    // insert product
    const insert = await pool.query(
      `INSERT INTO products (name, slug, description, price_cents, currency, category_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [name, slug, description, price_cents, currency, category_id]
    );
    const product = insert.rows[0];

    // save images if uploaded
    if (req.files?.length) {
      for (let i = 0; i < req.files.length; i++) {
        const f = req.files[i];
        await pool.query(
          `INSERT INTO product_images (product_id, path, is_primary)
           VALUES ($1,$2,$3)`,
          [product.id, `/uploads/${f.filename}`, i === 0]
        );
      }
    }

    res.status(201).json(product);
  } catch (err) {
    // Map common Postgres errors to friendly messages
    if (err?.code === '23505') {
      // unique_violation (e.g., slug unique)
      return res.status(409).json({ message: 'Slug already exists. Choose a different slug.' });
    }
    if (err?.code === '23503') {
      // foreign_key_violation (likely bad category_id)
      return res.status(400).json({ message: 'Invalid category.' });
    }
    console.error('POST /api/products error:', err);
    res.status(500).json({ message: 'Failed to add product' });
  }
});

/**
 * PUT /api/products/:id
 */
router.put('/:id', requireAuth, requireAdmin, upload.array('images', 4), async (req, res) => {
  try {
    const id = req.params.id;
    const name = (req.body.name || '').trim();
    const slug = (req.body.slug || '').trim().toLowerCase();
    const description = (req.body.description || '').trim();
    const currency = (req.body.currency || 'GBP').trim() || 'GBP';

    let price_cents = req.body.price_cents;
    if (typeof price_cents === 'string' && price_cents.includes('.')) {
      price_cents = Math.round(parseFloat(price_cents) * 100);
    } else {
      price_cents = Number(price_cents);
    }
    const category_id = req.body.category_id ? Number(req.body.category_id) : null;

    const upd = await pool.query(
      `UPDATE products
       SET name=$1, slug=$2, description=$3, price_cents=$4, currency=$5, category_id=$6, updated_at=now()
       WHERE id=$7
       RETURNING *`,
      [name, slug, description, price_cents, currency, category_id, id]
    );
    if (!upd.rows[0]) return res.status(404).json({ message: 'Not found' });

    // (optional) image handling on update...

    res.json(upd.rows[0]);
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(409).json({ message: 'Slug already exists.' });
    }
    if (err?.code === '23503') {
      return res.status(400).json({ message: 'Invalid category.' });
    }
    console.error('PUT /api/products/:id error:', err);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

/**
 * DELETE /api/products/:id
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/products/:id error:', err);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

export default router;
