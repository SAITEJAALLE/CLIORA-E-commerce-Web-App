import React, { useState, useEffect, useContext } from 'react';
import api from '../api.js';
import { AuthContext } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

// Orders page lists the authenticated user's orders with their items and
// statuses.
function Orders() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    async function fetchOrders() {
      try {
        const res = await api.get('/orders/me');
        setOrders(res.data.orders);
      } catch (err) {
        console.error('Error fetching orders', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [user, navigate]);

  if (loading) return <p>Loading...</p>;
  return (
    <div>
      <h2>My Orders</h2>
      {orders.length === 0 ? (
        <p>You have no orders.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} style={{ border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Order ID:</strong> {order.id}<br />
              <strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}<br />
              <strong>Status:</strong> {order.status} ({order.payment_status})<br />
              <strong>Total:</strong> £{(order.total_cents / 100).toFixed(2)}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.25rem 0.5rem' }}>{item.name}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'center' }}>£{(item.unit_price_cents / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

export default Orders;