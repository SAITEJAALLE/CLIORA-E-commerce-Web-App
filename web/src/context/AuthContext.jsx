import React, { createContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api.js';

// Context providing authentication state and actions. Stores user
// and token in localStorage to persist across page refreshes.
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // On mount check for token returned from Google OAuth in query
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      // Remove token param from URL
      params.delete('token');
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
    // If a user is stored in localStorage, ensure the token is set
    // This helps after a refresh to keep the token in memory.
  }, [location.search, location.pathname, navigate]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    await api.post('/auth/register', { name, email, password });
    // Auto-login after registration
    return login(email, password);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (_err) {
      // ignore
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}