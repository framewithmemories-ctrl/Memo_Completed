/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Convert FastAPI error detail (string or array) into a readable string
export const formatApiError = (detail) => {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e))).join(' ');
  }
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
};

const setAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Mirror auth user into the legacy localStorage keys other components rely on
const syncLegacyProfile = (user) => {
  if (!user) {
    localStorage.removeItem('memoriesUser');
    localStorage.removeItem('memoriesUserProfile');
    return;
  }
  const legacy = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
    preferences: user.preferences || '',
    profileComplete: true,
    createdAt: user.created_at || new Date().toISOString(),
  };
  localStorage.setItem('memoriesUser', JSON.stringify(legacy));
  localStorage.setItem('memoriesUserProfile', JSON.stringify(legacy));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const saved = localStorage.getItem('memoriesAuth');
    if (saved) {
      try {
        const { token: t, user: u } = JSON.parse(saved);
        if (t) {
          setAuthHeader(t);
          setToken(t);
          setUser(u);
          syncLegacyProfile(u);
          // Validate token in background
          axios
            .get(`${API}/auth/me`)
            .then((res) => {
              setUser(res.data.user);
              syncLegacyProfile(res.data.user);
            })
            .catch(() => {
              // token invalid/expired -> clear
              localStorage.removeItem('memoriesAuth');
              setAuthHeader(null);
              setToken(null);
              setUser(null);
              syncLegacyProfile(null);
            })
            .finally(() => setLoading(false));
          return;
        }
      } catch (e) {
        localStorage.removeItem('memoriesAuth');
      }
    }
    setLoading(false);
  }, []);

  const persist = useCallback((t, u) => {
    localStorage.setItem('memoriesAuth', JSON.stringify({ token: t, user: u }));
    setAuthHeader(t);
    setToken(t);
    setUser(u);
    syncLegacyProfile(u);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    persist(res.data.token, res.data.user);
    return res.data.user;
  }, [persist]);

  const register = useCallback(async (payload) => {
    const res = await axios.post(`${API}/auth/register`, payload);
    persist(res.data.token, res.data.user);
    return res.data.user;
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem('memoriesAuth');
    setAuthHeader(null);
    setToken(null);
    setUser(null);
    syncLegacyProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
