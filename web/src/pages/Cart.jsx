import React, { useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext.jsx';
import { useLocation } from 'react-router-dom';
import api from '../api.js';

export default function Cart() {
  const navigate = useNavigate();
  const { cart, setCart, clearCart } = useContext(CartContext);

  const items = Array.isArray(cart?.items) ? cart.items : [];
  const loc = useLocation();

React.useEffect(() => {
  const id = new URLSearchParams(loc.search).get('add');
  if (!id) return;

  (async () => {
    try {
      const { data: p } = await api.get(`/products/${id}`);
      setCart((prev) => {
        const items = [...(prev?.items || [])];
        const i = items.findIndex((x) => x.id === id);
        if (i >= 0) items[i] = { ...items[i], qty: Number(items[i].qty || 1) + 1 };
        else items.push({
          id: p.id,
          name: p.name,
          image: p.image || null,
          price_cents: p.price_cents,
          category_name: p.category_name || '',
          qty: 1
        });
        return { ...(prev || {}), items };
      });
    } finally {
      // strip ?add from URL
      window.history.replaceState(null, '', '/cart');
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [loc.search]);

  const totalCents = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.price_cents || 0) * Number(it.qty || 1), 0),
    [items]
  );
  const totalGBP = `£${(totalCents / 100).toFixed(2)}`;

  function updateQty(id, delta) {
    setCart((prev) => {
      const next = { ...(prev || {}), items: [...(prev?.items || [])] };
      const idx = next.items.findIndex((i) => i.id === id);
      if (idx >= 0) {
        const q = Math.max(1, Number(next.items[idx].qty || 1) + delta);
        next.items[idx] = { ...next.items[idx], qty: q };
      }
      return next;
    });
  }

  function removeItem(id) {
    setCart((prev) => ({ ...(prev || {}), items: (prev?.items || []).filter((i) => i.id !== id) }));
  }

  if (items.length === 0) {
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
              <th style={{width: '45%'}}>Product</th>
              <th>Price</th>
              <th style={{width: 160}}>Qty</th>
              <th>Subtotal</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const price = `£${(Number(it.price_cents || 0) / 100).toFixed(2)}`;
              const subCents = Number(it.price_cents || 0) * Number(it.qty || 1);
              const sub = `£${(subCents / 100).toFixed(2)}`;
              return (
                <tr key={it.id}>
                  <td>
                    <div style={{display:'flex', gap:12, alignItems:'center'}}>
                      <div style={{
                        width:56, height:56, borderRadius:12, background:'#fff',
                        backgroundImage: it.image ? `url(${it.image})` : 'linear-gradient(135deg,#e8e3cf,#e2d7c6)',
                        backgroundSize:'cover', backgroundPosition:'center',
                        border:'1px solid rgba(156,175,170,.35)'
                      }} />
                      <div>
                        <div style={{color:'#0F1412', fontWeight:800}}>{it.name}</div>
                        <div style={{fontSize:'.9rem'}}>{it.category_name || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>{price}</td>
                  <td>
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                      <button className="btn-ghost" type="button" onClick={() => updateQty(it.id, -1)}>-</button>
                      <div style={{minWidth:36, textAlign:'center', fontWeight:700}}>{it.qty || 1}</div>
                      <button className="btn-ghost" type="button" onClick={() => updateQty(it.id, +1)}>+</button>
                    </div>
                  </td>
                  <td>{sub}</td>
                  <td>
                    <button className="btn-ghost" type="button" onClick={() => removeItem(it.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16}}>
          <button className="btn-ghost" type="button" onClick={clearCart}>Clear cart</button>
          <div style={{display:'flex', gap:12, alignItems:'center'}}>
            <div style={{fontWeight:800, color:'#0F1412'}}>Total: {totalGBP}</div>
            <button className="btn" type="button" onClick={() => navigate('/checkout')}>Checkout</button>
          </div>
        </div>
      </div>
    </div>
  );
}
