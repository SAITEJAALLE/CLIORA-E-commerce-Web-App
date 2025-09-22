import { useEffect, useState, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api.js";
import { CartContext } from "../context/CartContext.jsx";

export default function ProductDetail() {
  const { id } = useParams(); // uuid or int
  const navigate = useNavigate();
  const { addItem } = useContext(CartContext);

  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/products/${id}`);
        if (!alive) return;
        const img =
          data?.image ||
          (Array.isArray(data?.images) ? data.images[0] : null) ||
          null;
        const pid = data?.id ?? data?._id ?? data?.product_id;
        setProduct({ ...data, id: pid, image: img });
        setNotFound(!data);
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) return <div className="container">Loading…</div>;
  if (notFound || !product) return <div className="container">Product not found</div>;

  const price = `£${(Number(product.price_cents || 0) / 100).toFixed(2)}`;

  const handleAdd = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        image: product.image || null,
        price_cents: product.price_cents,
        currency: product.currency || "GBP",
        category_name: product.category_name || "",
      },
      1
    );
    navigate("/cart");
  };

  return (
    <div className="container">
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          className="card-media"
          style={{
            height: 320,
            backgroundImage: product.image
              ? `url(${product.image})`
              : "linear-gradient(135deg,#e8e3cf,#e2d7c6)",
          }}
        />
        <div className="card-content">
          <h1 className="card-title" style={{ fontSize: "1.5rem" }}>
            {product.name}
          </h1>
          <p className="card-desc">{product.description}</p>
          <div className="price" style={{ fontSize: "1.2rem" }}>{price}</div>
          <div className="card-actions">
            <button className="btn" onClick={handleAdd}>Add to Cart</button>
            <Link className="btn btn-ghost" to="/">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
