/**
 * useAuth — React Hook wrapping AuthService
 *
 * Provides: { isAuthenticated, isLoading, login, logout, accessToken }
 * On mount: checks URL for OAuth callback, then checks for existing refresh_token.
 */

import { useState, useEffect, useCallback } from 'react';
import AuthService from '../services/AuthService';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  accessToken: string | null;
}

export function useAuth(): UseAuthReturn {
  const auth = AuthService.getInstance();

  const [isAuthenticated, setIsAuthenticated] = useState(auth.isAuthenticated);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // 1. Check if this is an OAuth callback
        const wasCallback = await auth.handleCallback();

        if (wasCallback || auth.isAuthenticated) {
          // 2. Try to get a valid access token (will refresh if needed)
          const token = await auth.getAccessToken();
          if (!cancelled) {
            setAccessToken(token);
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.error('[useAuth] Init failed:', err);
        if (!cancelled) {
          setIsAuthenticated(false);
          setAccessToken(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, [auth]);

  const login = useCallback(async () => {
    await auth.login();
  }, [auth]);

  const logout = useCallback(() => {
    auth.logout();
    setIsAuthenticated(false);
    setAccessToken(null);
  }, [auth]);

  return { isAuthenticated, isLoading, login, logout, accessToken };
}

export default useAuth;
