import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api.js';
import { AuthContext } from '../context/AuthContext.jsx';
import logo from '../assets/cliora-logo.svg';

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!form.name || !form.email || !form.password) {
      setErr('Please fill all fields');
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      // if server returns user + token via cookie (httpOnly), set user in context
      if (data?.user) setUser(data.user);
      navigate('/');
    } catch (error) {
      const msg = error?.response?.data?.message || 'Registration failed';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="auth-wrap">
        <div className="auth-logo">
          <img src={logo} alt="Cliora" />
          <h2 className="auth-title">Create account</h2>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-field">
            <label className="label" htmlFor="name">Name</label>
            <input className="input input-full" id="name" name="name" value={form.name} onChange={onChange} />
          </div>
          <div className="form-field">
            <label className="label" htmlFor="email">Email</label>
            <input className="input input-full" id="email" type="email" name="email" value={form.email} onChange={onChange} />
          </div>
          <div className="form-field">
            <label className="label" htmlFor="password">Password</label>
            <input className="input input-full" id="password" type="password" name="password" value={form.password} onChange={onChange} />
          </div>

          {err && <div className="form-error">{err}</div>}

          <div className="auth-actions">
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Register'}</button>
            <Link className="btn-ghost" to="/login">I already have an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
