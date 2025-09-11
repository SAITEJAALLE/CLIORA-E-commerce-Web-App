import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import { AuthContext } from '../context/AuthContext.jsx';

export default function Admin() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [pricePence, setPricePence] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [images, setImages] = useState([]);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user) return navigate('/login');
    if (user?.role !== 'admin') return navigate('/');
  }, [user, navigate]);

  async function loadProducts() {
    try {
      const res = await api.get('/products', { params: { page: 1, sort: 'new' } });
      setProducts(res.data.items || []);

      // build categories list from products
      const map = new Map();
      for (const p of res.data.items) {
        if (p.category_id && p.category_name) {
          map.set(p.category_id, p.category_name);
        }
      }
      const list = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
      setCategories(list);
      if (list.length && !categoryId) setCategoryId(list[0].id);
    } catch (e) {
      console.error('Failed to load products', e);
    }
  }

  async function loadOrders() {
    try {
      const res = await api.get('/orders'); // admin list
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load orders', e);
    }
  }

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  async function handleAddProduct(e) {
    e.preventDefault();
    setErrorMsg('');
    if (!name || !slug || !pricePence || !categoryId) {
      return setErrorMsg('All fields are required');
    }

    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('name', name);
      fd.append('slug', slug.toLowerCase());
      fd.append('description', description);
      fd.append('price_cents', String(Number(pricePence)));
      fd.append('currency', 'GBP');
      fd.append('category_id', String(categoryId));

      for (const f of images) fd.append('images', f);

      await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      setName('');
      setSlug('');
      setDescription('');
      setPricePence('');
      setImages([]);
      await loadProducts();
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to add product';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProduct(id) {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert('Failed to delete product.');
    }
  }

  async function updateOrderStatus(id, status) {
    try {
      await api.patch(`/orders/${id}`, { status });
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o))
      );
    } catch (e) {
      alert('Failed to update order status.');
    }
  }

  return (
    <div className="container">
      <h1>Admin Dashboard</h1>

      {/* PRODUCTS */}
      <div className="admin-panel">
        <h2>Products</h2>
        <form className="admin-form" onSubmit={handleAddProduct}>
          <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Slug (unique)" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <input className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input className="input" type="number" placeholder="Price (pence)" value={pricePence} onChange={(e) => setPricePence(e.target.value)} />
          <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input type="file" multiple onChange={(e) => setImages(Array.from(e.target.files || []))} />
          <button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add Product'}</button>
        </form>
        {errorMsg && <div className="form-error">{errorMsg}</div>}

        <table>
          <thead>
            <tr>
              <th>Name</th><th>Category</th><th>Price</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category_name || '-'}</td>
                <td>£{(Number(p.price_cents) / 100).toFixed(2)}</td>
                <td>
                  <button onClick={() => handleDeleteProduct(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!products.length && <tr><td colSpan="4">No products yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* ORDERS */}
      <div className="admin-panel">
        <h2>Orders</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>User</th><th>Status</th><th>Payment</th><th>Total</th><th>Update</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td style={{ fontFamily: 'monospace' }}>{o.id.slice(0,8)}…</td>
                <td>{o.user_email || o.user_name || o.user_id}</td>
                <td>{o.status}</td>
                <td>{o.payment_status}</td>
                <td>£{(Number(o.total_cents) / 100).toFixed(2)}</td>
                <td>
                  <select className="select" value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)}>
                    <option value="pending">pending</option>
                    <option value="paid">paid</option>
                    <option value="shipped">shipped</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan="6">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
