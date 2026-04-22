import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../lib/api';

const TOKEN_KEY = 'plotbunni_auth_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveToken = useCallback((t) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Quick client-side expiry check before hitting the server
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) { logout(); setLoading(false); return; }
    } catch { logout(); setLoading(false); return; }

    // Fetch full profile — includes is_admin and subscription fields
    fetch(`${API_BASE}/api/v1/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatar_url,
        isAdmin: data.is_admin || false,
        subscriptionStatus: data.subscription_status || 'free',
        subscriptionTier: data.subscription_tier || null,
        subscriptionEndsAt: data.subscription_ends_at || null,
      }))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ token, user, loading, saveToken, logout, isAuthenticated: !!token && !loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
