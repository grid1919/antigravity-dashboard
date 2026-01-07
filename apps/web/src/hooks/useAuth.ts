import { useState, useCallback, useEffect } from 'react';

const AUTH_TOKEN_KEY = 'antigravity_auth_token';

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(() => {
    return sessionStorage.getItem(AUTH_TOKEN_KEY);
  });
  const [authRequired, setAuthRequired] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const setToken = useCallback((newToken: string | null) => {
    if (newToken) {
      sessionStorage.setItem(AUTH_TOKEN_KEY, newToken);
    } else {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
    }
    setTokenState(newToken);
    setAuthError(null);
  }, []);

  const clearToken = useCallback(() => {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    setTokenState(null);
  }, []);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers);
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      setAuthRequired(true);
      const data = await response.clone().json().catch(() => ({}));
      setAuthError(data.message || 'Authentication required');
    }

    return response;
  }, [token]);

  const checkAuthRequired = useCallback(async () => {
    try {
      const response = await fetch('/api/health');
      if (response.status === 401) {
        setAuthRequired(true);
        return true;
      }
      setAuthRequired(false);
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    checkAuthRequired();
  }, [checkAuthRequired]);

  return {
    token,
    setToken,
    clearToken,
    authRequired,
    setAuthRequired,
    authError,
    authFetch,
    checkAuthRequired,
    isAuthenticated: !authRequired || !!token,
  };
}
