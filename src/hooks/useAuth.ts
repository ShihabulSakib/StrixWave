import { useState, useEffect, useCallback } from 'react';
import AuthManager from '../services/auth/AuthManager';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  isProviderAuthenticated: (providerId: string) => boolean;
  login: (providerId?: string) => Promise<void>;
  logout: (providerId?: string) => void;
  getAccessToken: (providerId?: string) => Promise<string | null>;
}

export function useAuth(): UseAuthReturn {
  const authManager = AuthManager.getInstance();
  const [isAuthenticated, setIsAuthenticated] = useState(authManager.isAuthenticated());
  const [isLoading, setIsLoading] = useState(true);
  const [, setTick] = useState(0); // For forcing re-renders on auth state change

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const wasCallback = await authManager.handleCallback();
        if (wasCallback) {
          // Force update
          setTick(t => t + 1);
        }
        if (!cancelled) {
          setIsAuthenticated(authManager.isAuthenticated());
        }
      } catch (err) {
        console.error('[useAuth] Init failed:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  const isProviderAuthenticated = useCallback((providerId: string) => {
    return authManager.getProvider(providerId)?.isAuthenticated() || false;
  }, []);

  const login = useCallback(async (providerId: string = 'dropbox') => {
    const provider = authManager.getProvider(providerId);
    if (provider) {
      await provider.login();
    }
  }, []);

  const logout = useCallback((providerId?: string) => {
    if (providerId) {
      authManager.getProvider(providerId)?.logout();
    } else {
      authManager.getAllProviders().forEach(p => p.logout());
    }
    setIsAuthenticated(authManager.isAuthenticated());
    setTick(t => t + 1);
  }, []);

  const getAccessToken = useCallback(async (providerId: string = 'dropbox') => {
    try {
      return await authManager.getProvider(providerId)?.getAccessToken() || null;
    } catch {
      return null;
    }
  }, []);

  return { 
    isAuthenticated, 
    isLoading, 
    isProviderAuthenticated,
    login, 
    logout, 
    getAccessToken 
  };
}

export default useAuth;
