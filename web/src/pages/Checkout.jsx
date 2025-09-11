import  { useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { CartContext } from '../context/CartContext.jsx';

export default function Checkout() {
  const { cart, clearCart } = useContext(CartContext);
  const items = Array.isArray(cart?.items) ? cart.items : [];

  const totalCents = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.price_cents || 0) * Number(it.qty || 1), 0),
    [items]
  );
  const totalGBP = `£${(totalCents / 100).toFixed(2)}`;

  const [form, setForm] = useState({
    name: '',
    email: '',
    address1: '',
    city: '',
    postcode: '',
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function startCheckout(e) {
    e.preventDefault();
    setErr('');
    if (!items.length) { setErr('Your cart is empty.'); return; }

    try {
      setLoading(true);
      const payload = {
        address: {
          name: form.name,
          email: form.email,
          line1: form.address1,
          city: form.city,
          postal_code: form.postcode,
        },
        items: items.map((it) => ({
          id: it.id,
          name: it.name,
          price_cents: Number(it.price_cents || 0),
          qty: Number(it.qty || 1),
          image: it.image || null,
        })),
      };
      const { data } = await api.post('/checkout/session', payload);
      if (data?.url) {
        window.location.assign(data.url);  // redirect to Stripe
      } else {
        setErr('Could not start checkout.');
      }
    } catch (error) {
      setErr(error?.response?.data?.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="product-detail" style={{ marginBottom: 18 }}>
        {/* Summary */}
        <div className="content" style={{ order:2 }}>
          <h1 className="title">Checkout</h1>
          <p className="desc">Please review your order and enter your shipping details.</p>

          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td>{it.qty || 1}</td>
                  <td>£{(Number(it.price_cents || 0) / 100).toFixed(2)}</td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan="3">Your cart is empty.</td></tr>}
            </tbody>
          </table>

          <div style={{display:'flex', justifyContent:'space-between', marginTop:12}}>
            <Link className="btn-ghost" to="/">Back to shop</Link>
            <div style={{fontWeight:800, color:'#0F1412'}}>Total: {totalGBP}</div>
          </div>
        </div>

        {/* Address form */}
        <div className="content" style={{ order:1 }}>
          <h2 className="title" style={{ fontSize:'1.3rem' }}>Shipping details</h2>
          <form onSubmit={startCheckout}>
            <div className="form-field">
              <label className="label">Full name</label>
              <input className="input input-full" name="name" value={form.name} onChange={onChange} required />
            </div>
            <div className="form-field">
              <label className="label">Email</label>
              <input className="input input-full" type="email" name="email" value={form.email} onChange={onChange} required />
            </div>
            <div className="form-field">
              <label className="label">Address</label>
              <input className="input input-full" name="address1" value={form.address1} onChange={onChange} required />
            </div>
            <div className="form-field" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
              <div>
                <label className="label">City</label>
                <input className="input input-full" name="city" value={form.city} onChange={onChange} required />
              </div>
              <div>
                <label className="label">Postcode</label>
                <input className="input input-full" name="postcode" value={form.postcode} onChange={onChange} required />
              </div>
            </div>

            {err && <div className="form-error">{err}</div>}

            <div className="cta" style={{ marginTop: 8 }}>
              <button className="btn" type="submit" disabled={loading || !items.length}>
                {loading ? 'Redirecting…' : 'Pay with Stripe'}
              </button>
              <button className="btn-ghost" type="button" onClick={clearCart}>Clear cart</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
