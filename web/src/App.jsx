// web/src/App.jsx
import React, { useContext } from 'react';
import { Routes, Route } from 'react-router-dom';

import { AuthContext } from './context/AuthContext.jsx';

import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';

import Home from './pages/Home.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Admin from './pages/Admin.jsx';

function RequireAdmin({ children }) {
  const { user } = useContext(AuthContext) || {};
  if (!user || user.role !== 'admin') {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <h2>Access denied</h2>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            }
          />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
