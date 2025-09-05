import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api.js';

export default function ProductDetail() {
  const { id } = useParams(); // id, not slug
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function fetchOne() {
      try {
        setLoading(true);
        const res = await api.get(`/products/${id}`);
        if (!ignore) setProduct(res.data);
      } catch (e) {
        if (!ignore) setNotFound(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchOne();
    return () => { ignore = true; };
  }, [id]);

  if (loading) return <div className="container">Loading…</div>;
  if (notFound || !product) return <div className="container">Product not found</div>;

  const price = `£${(Number(product.price_cents || 0) / 100).toFixed(2)}`;
  const img = product.image || '';

  return (
    <div className="container">
      <div className="card" style={{ overflow: 'hidden' }}>
        <div
          className="card-media"
          style={{
            height: 320,
            backgroundImage: img ? `url(${img})` : 'linear-gradient(135deg,#e8e3cf,#e2d7c6)',
          }}
        />
        <div className="card-content">
          <h1 className="card-title" style={{ fontSize: '1.5rem' }}>{product.name}</h1>
          <p className="card-desc">{product.description}</p>
          <div className="price" style={{ fontSize: '1.2rem' }}>{price}</div>
          <div className="card-actions">
            <Link className="btn" to={`/cart?add=${product.id}`}>Add to Cart</Link>
            <Link className="btn btn-ghost" to="/">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
