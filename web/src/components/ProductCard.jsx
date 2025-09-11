import React from 'react';
import { Link } from 'react-router-dom';
import ReactDOM from 'react-dom/client'
import ReactDOM from 'react-dom/client'


import { CartContext } from '../context/CartContext.jsx';

export default function ProductCard({ product }) {
  const { setCart } = React.useContext(CartContext);

  const price = `£${(Number(product.price_cents || 0) / 100).toFixed(2)}`;
  const img = product.image || (product.images && product.images[0]) || null;

  const bgStyle = img
    ? { backgroundImage: `url(${img})` }
    : { backgroundImage: 'linear-gradient(135deg,#e8e3cf,#e2d7c6)' };

  function addToCart() {
    setCart(prev => {
      const items = [...(prev?.items || [])];
      const idx = items.findIndex(i => i.id === product.id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], qty: Number(items[idx].qty || 1) + 1 };
      } else {
        items.push({
          id: product.id,
          name: product.name,
          image: img,
          price_cents: product.price_cents,
          category_name: product.category_name || '',
          qty: 1,
        });
      }
      return { ...(prev || {}), items };
    });
  }

  return (
    <div className="card">
      <div className="card-media" style={bgStyle}>
        <div className="price-badge">{price}</div>
      </div>

      <div className="card-content">
        <h3 className="card-title">{product.name}</h3>
        <p className="card-desc">{product.description || product.category_name || ' '}</p>

        <div className="card-actions">
          <Link className="btn-ghost" to={`/products/${product.id}`}>View</Link>
          <button className="btn" onClick={addToCart}>Add to Cart</button>
        </div>
      </div>
    </div>
  );
}
