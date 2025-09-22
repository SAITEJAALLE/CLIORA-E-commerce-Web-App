import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

/**
 * GET /api/cart
 * Returns: { items: [{ product_id, name, unit_price_cents, currency, image, quantity }...] }
 * Joins products but falls back to stored fields if product was changed/removed.
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT
        ci.product_id::text                                   AS product_id,
        ci.quantity,
        COALESCE(ci.unit_price_cents, p.price_cents, 0)       AS unit_price_cents,
        COALESCE(ci.currency, p.currency, 'GBP')              AS currency,
        COALESCE(ci.name, p.name, 'Unknown')                  AS name,
        COALESCE(
          ci.image,
          (
            SELECT path FROM product_images i
            WHERE i.product_id = p.id
            ORDER BY is_primary DESC, id ASC
            LIMIT 1
          ),
          ''
        )                                                     AS image
      FROM cart_items ci
      LEFT JOIN products p
        ON p.id::text = ci.product_id::text
      WHERE ci.user_id = $1
      ORDER BY ci.id ASC;
    `;
    const { rows } = await pool.query(sql, [userId]);
    res.json({ items: rows });
  } catch (err) {
    console.error("GET /api/cart error:", err);
    res.status(500).json({ message: "Failed to fetch cart" });
  }
});

/**
 * POST /api/cart
 * Body: { items: [{ product_id, quantity }] }
 * Upserts items for the current user. quantity 0 removes the item.
 * Accepts UUIDs or integers for product_id.
 */
router.post("/", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!items.length) return res.json({ ok: true, items: [] });

  // limit to something reasonable
  const safe = items.slice(0, 100).map((it) => ({
    product_id: String(it.product_id || "").trim(),
    quantity: Number(it.quantity || 0),
  }));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const it of safe) {
      if (!it.product_id) continue;

      if (it.quantity <= 0) {
        await client.query(
          "DELETE FROM cart_items WHERE user_id = $1 AND product_id::text = $2",
          [userId, it.product_id]
        );
        continue;
      }

      // Get canonical product fields for snapshot (name, price, image)
      const psql = `
        SELECT
          p.id,
          p.name,
          p.price_cents,
          p.currency,
          (
            SELECT path FROM product_images i
            WHERE i.product_id = p.id
            ORDER BY is_primary DESC, id ASC
            LIMIT 1
          ) AS image
        FROM products p
        WHERE p.id::text = $1
        LIMIT 1
      `;
      const { rows: prow } = await client.query(psql, [it.product_id]);
      if (!prow[0]) {
        // if product not found, skip insert (or you may choose to 404)
        continue;
      }
      const snap = prow[0];

      // Try update first
      const upd = await client.query(
        `UPDATE cart_items
           SET quantity = $1,
               unit_price_cents = $2,
               currency = COALESCE($3, 'GBP'),
               name = $4,
               image = $5,
               updated_at = now()
         WHERE user_id = $6 AND product_id::text = $7
         RETURNING id`,
        [
          it.quantity,
          snap.price_cents,
          snap.currency,
          snap.name,
          snap.image || "",
          userId,
          it.product_id,
        ]
      );

      if (!upd.rowCount) {
        // Insert if not exists
        await client.query(
          `INSERT INTO cart_items
             (user_id, product_id, quantity, unit_price_cents, currency, name, image)
           VALUES ($1,        $2,         $3,       $4,               $5,      $6,   $7)`,
          [
            userId,
            it.product_id,
            it.quantity,
            snap.price_cents,
            snap.currency || "GBP",
            snap.name,
            snap.image || "",
          ]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/cart error:", err);
    res.status(500).json({ message: "Failed to update cart" });
  } finally {
    client.release();
  }
});

export default router;
