import { useContext, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api.js";
import { CartContext } from "../context/CartContext.jsx";

export default function Cart() {
  const navigate = useNavigate();
  const loc = useLocation();
  const { items, addItem, updateQuantity, removeItem, clearCart, totalCents } =
    useContext(CartContext);

  // Support legacy /cart?add=<id> (e.g. old ProductDetail link)
  useEffect(() => {
    const id = new URLSearchParams(loc.search).get("add");
    if (!id) return;

    (async () => {
      try {
        const { data: p } = await api.get(`/products/${id}`);
        const img =
          p?.image || (Array.isArray(p?.images) ? p.images[0] : null) || null;
        addItem({
          id: p?.id ?? p?._id ?? p?.product_id,
          name: p?.name ?? "",
          slug: p?.slug,
          price_cents: p?.price_cents ?? 0,
          currency: p?.currency ?? "GBP",
          image: img,
          category_name: p?.category_name ?? "",
        });
      } catch (e) {
        console.warn("Failed to add via ?add=", id, e?.response?.status || e?.message);
      } finally {
        // strip ?add= from URL to avoid re-adding on refresh
        window.history.replaceState(null, "", "/cart");
      }
    })();
  }, [loc.search, addItem]);

  const hasItems = Array.isArray(items) && items.length > 0;

  const totalGBP = useMemo(
    () => `£${(Number(totalCents || 0) / 100).toFixed(2)}`,
    [totalCents]
  );

  if (!hasItems) {
    return (
      <div className="container">
        <div className="admin-panel">
          <h2>Your Cart</h2>
          <p>Your cart is empty.</p>
          <Link className="btn" to="/">Continue shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="admin-panel">
        <h2>Your Cart</h2>

        <table>
          <thead>
            <tr>
              <th style={{ width: "45%" }}>Product</th>
              <th>Price</th>
              <th style={{ width: 160 }}>Qty</th>
              <th>Subtotal</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map(({ product, quantity }) => {
              const price = `£${(Number(product?.price_cents || 0) / 100).toFixed(2)}`;
              const subCents = Number(product?.price_cents || 0) * Number(quantity || 0);
              const sub = `£${(subCents / 100).toFixed(2)}`;
              return (
                <tr key={product.id}>
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 12,
                          background: "#fff",
                          backgroundImage: product.image
                            ? `url(${product.image})`
                            : "linear-gradient(135deg,#e8e3cf,#e2d7c6)",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          border: "1px solid rgba(156,175,170,.35)",
                        }}
                      />
                      <div>
                        <div style={{ color: "#0F1412", fontWeight: 800 }}>
                          {product.name}
                        </div>
                        <div style={{ fontSize: ".9rem" }}>
                          {product.category_name || ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{price}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        className="btn-ghost"
                        type="button"
                        onClick={() => updateQuantity(product.id, Math.max(0, (quantity || 0) - 1))}
                      >
                        -
                      </button>
                      <div style={{ minWidth: 36, textAlign: "center", fontWeight: 700 }}>
                        {quantity || 0}
                      </div>
                      <button
                        className="btn-ghost"
                        type="button"
                        onClick={() => updateQuantity(product.id, (quantity || 0) + 1)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td>{sub}</td>
                  <td>
                    <button
                      className="btn-ghost"
                      type="button"
                      onClick={() => removeItem(product.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <button className="btn-ghost" type="button" onClick={clearCart}>
            Clear cart
          </button>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontWeight: 800, color: "#0F1412" }}>
              Total: {totalGBP}
            </div>
            <button className="btn" type="button" onClick={() => navigate("/checkout")}>
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
