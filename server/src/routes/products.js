import { Router } from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";

const router = Router();

/*  Upload config  */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, "uploads"),
  filename: (_, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

/**
 * Query: page, q, category, sort(new|price_asc|price_desc)
 * Returns: { items, total, page, pageSize }
 */
router.get("/", async (req, res) => {
  try {
    const pageSize = 12;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const q = (req.query.q || "").trim();
    const category = (req.query.category || "").trim();
    const sort = (req.query.sort || "new").trim();

    const sortMap = {
      new: "p.created_at DESC",
      price_asc: "p.price_cents ASC",
      price_desc: "p.price_cents DESC",
    };
    const orderBy = sortMap[sort] || sortMap.new;

    const where = [];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`
      );
    }
    if (category) {
      params.push(category);
      where.push(`c.slug = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countSql = `
      SELECT COUNT(*) AS count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
    `;
    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows[0]?.count || "0", 10);

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
    console.error("GET /api/products error:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

/**
 * GET /api/products/:id
 * Accepts UUID or integer ids. (Compare as text to be flexible.)
 */
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id.trim();

    const sql = `
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
      WHERE p.id::text = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [id]);
    if (!rows[0]) return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/products/:id error:", err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
});

/*  Admin: Create / Update / Delete  */

router.post(
  "/",
  requireAuth,
  requireAdmin,
  upload.array("images", 4),
  async (req, res) => {
    try {
      const name = (req.body.name || "").trim();
      const slug = (req.body.slug || "").trim().toLowerCase();
      const description = (req.body.description || "").trim();
      const currency = (req.body.currency || "GBP").trim() || "GBP";

      let price_cents = req.body.price_cents;
      if (typeof price_cents === "string" && price_cents.includes(".")) {
        price_cents = Math.round(parseFloat(price_cents) * 100);
      } else {
        price_cents = Number(price_cents);
      }

      const category_id = req.body.category_id ? Number(req.body.category_id) : null;

      if (!name) return res.status(400).json({ message: "Name is required" });
      if (!slug) return res.status(400).json({ message: "Slug is required" });
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return res
          .status(400)
          .json({ message: "Slug must be lowercase letters, numbers, or hyphens" });
      }
      if (!Number.isFinite(price_cents) || price_cents < 0) {
        return res.status(400).json({ message: "Price (in pence) is invalid" });
      }

      const insert = await pool.query(
        `INSERT INTO products (name, slug, description, price_cents, currency, category_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [name, slug, description, price_cents, currency, category_id]
      );
      const product = insert.rows[0];

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
      if (err?.code === "23505") {
        return res.status(409).json({ message: "Slug already exists. Choose a different slug." });
      }
      if (err?.code === "23503") {
        return res.status(400).json({ message: "Invalid category." });
      }
      console.error("POST /api/products error:", err);
      res.status(500).json({ message: "Failed to add product" });
    }
  }
);

router.put("/:id", requireAuth, requireAdmin, upload.array("images", 4), async (req, res) => {
  try {
    const id = req.params.id.trim();
    const name = (req.body.name || "").trim();
    const slug = (req.body.slug || "").trim().toLowerCase();
    const description = (req.body.description || "").trim();
    const currency = (req.body.currency || "GBP").trim() || "GBP";

    let price_cents = req.body.price_cents;
    if (typeof price_cents === "string" && price_cents.includes(".")) {
      price_cents = Math.round(parseFloat(price_cents) * 100);
    } else {
      price_cents = Number(price_cents);
    }
    const category_id = req.body.category_id ? Number(req.body.category_id) : null;

    const upd = await pool.query(
      `UPDATE products
       SET name=$1, slug=$2, description=$3, price_cents=$4, currency=$5, category_id=$6, updated_at=now()
       WHERE id::text=$7
       RETURNING *`,
      [name, slug, description, price_cents, currency, category_id, id]
    );
    if (!upd.rows[0]) return res.status(404).json({ message: "Not found" });

    res.json(upd.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ message: "Slug already exists." });
    }
    if (err?.code === "23503") {
      return res.status(400).json({ message: "Invalid category." });
    }
    console.error("PUT /api/products/:id error:", err);
    res.status(500).json({ message: "Failed to update product" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM products WHERE id::text=$1", [req.params.id.trim()]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/products/:id error:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

export default router;
