import { useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { CartContext } from "../context/CartContext.jsx";

export default function ProductCard({ product }) {
  const { addItem } = useContext(CartContext);

  const pid = product?.id ?? product?._id ?? product?.product_id;
  const img = product?.image || (Array.isArray(product?.images) ? product.images[0] : null);

  const price = useMemo(() => {
    const cents = Number(product?.price_cents || 0);
    return `£${(cents / 100).toFixed(2)}`;
  }, [product]);

  const bgStyle = img
    ? { backgroundImage: `url(${img})` }
    : { backgroundImage: "linear-gradient(135deg,#e8e3cf,#e2d7c6)" };

  const handleAdd = () => {
    if (!pid) return;
    addItem({
      id: pid,
      name: product.name,
      slug: product.slug,
      price_cents: product.price_cents,
      currency: product.currency || "GBP",
      image: img || null,
      category_name: product.category_name || "",
    });
  };

  return (
    <div className="card">
      <div className="card-media" style={bgStyle}>
        <div className="price-badge">{price}</div>
      </div>

      <div className="card-content">
        <h3 className="card-title">{product?.name}</h3>
        <p className="card-desc">{product?.description || product?.category_name || " "}</p>

        <div className="card-actions">
          <Link
            className="btn-ghost"
            to={pid ? `/products/${pid}` : "#"}
            onClick={(e) => { if (!pid) e.preventDefault(); }}
            aria-disabled={!pid}
          >
            View
          </Link>
          <button className="btn" onClick={handleAdd} disabled={!pid}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
