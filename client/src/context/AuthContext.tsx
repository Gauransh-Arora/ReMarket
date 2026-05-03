import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export const API_BASE = 'http://localhost:3000';

interface AuthUser {
  sub: string;      // user id
  email: string;
  role: string;
  name?: string;
  exp?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseJwt(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => sessionStorage.getItem('accessToken')
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const t = sessionStorage.getItem('accessToken');
    return t ? parseJwt(t) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // On mount, try silent refresh to restore session from httpOnly refresh cookie
  const silentRefresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('accessToken', data.accessToken);
        setAccessToken(data.accessToken);
        setUser(parseJwt(data.accessToken));
      } else if (res.status === 401) {
        // Session truly expired or refresh token revoked
        sessionStorage.removeItem('accessToken');
        setAccessToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Silent refresh failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // If we already have a token in session, check it's not expired
    if (accessToken) {
      const parsed = parseJwt(accessToken);
      if (parsed && parsed.exp && parsed.exp * 1000 > Date.now()) {
        setUser(parsed);
        setIsLoading(false);
        return;
      }
    }
    silentRefresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh 1 min before expiry
  useEffect(() => {
    if (!accessToken) return;
    const parsed = parseJwt(accessToken);
    if (!parsed?.exp) return;
    const msUntilExpiry = parsed.exp * 1000 - Date.now();
    const refreshAt = msUntilExpiry - 60_000;
    if (refreshAt <= 0) return;
    const timer = setTimeout(silentRefresh, refreshAt);
    return () => clearTimeout(timer);
  }, [accessToken, silentRefresh]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    sessionStorage.setItem('accessToken', data.accessToken);
    setAccessToken(data.accessToken);
    setUser(parseJwt(data.accessToken));
  };

  const register = async (name: string, email: string, password: string, phone: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } catch { /* best effort */ }
    sessionStorage.removeItem('accessToken');
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
