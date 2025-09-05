import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api.js';
import { AuthContext } from '../context/AuthContext.jsx';
import logo from '../assets/cliora-logo.svg';

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setErr('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data?.token) {
        localStorage.setItem('access_token', data.token);
      }
      setUser(data.user);
      navigate('/');
    } catch (error) {
      setErr(error?.response?.data?.message || 'Login failed');
    }
  }

  function loginWithGoogle() {
    window.location.href = '/api/auth/google';
  }

  return (
    <div className="container">
      <div className="auth-wrap">
        <div className="auth-logo">
          <img src={logo} alt="Cliora" />
          <h2 className="auth-title">Login to Cliora</h2>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-field">
            <label className="label">Email</label>
            <input
              className="input input-full"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="label">Password</label>
            <input
              className="input input-full"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {err && <div style={{ color: '#ef4444', marginTop: 6 }}>{err}</div>}

          <div className="auth-actions">
            <button className="btn" type="submit">Login</button>
            <button className="btn btn-ghost" type="button" onClick={loginWithGoogle}>
              Login with Google
            </button>
            <div style={{ marginLeft: 'auto' }}>
              <Link to="/register" className="nav-link" style={{ padding: 0 }}>Create account</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
