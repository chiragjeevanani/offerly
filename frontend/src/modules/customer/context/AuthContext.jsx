import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '../../../utils/storage';
import { userAPI } from '../../../api/user.api';
import { releasePushTokenOnLogout } from '../../../utils/push';

const AuthContext = createContext(null);

// The profile check on startup almost always returns exactly what is already in
// localStorage. Swapping in a fresh-but-identical object would still re-render
// every consumer and re-fire every effect keyed on `user`, so keep the old one.
const isSameUser = (a, b) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => storage.getUser());
  const [authStatus, setAuthStatus] = useState(() => (storage.getToken() ? 'authenticated' : 'unauthenticated'));

  // Validate user on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const token = storage.getToken();
      if (!token) {
        setAuthStatus('unauthenticated');
        setUser(null);
        return;
      }

      try {
        const response = await userAPI.getProfile();
        const profile = response.user || response;
        setUser((prev) => (isSameUser(prev, profile) ? prev : profile));
        setAuthStatus('authenticated');
        storage.setUser(profile);
      } catch (error) {
        console.error('Auth verification failed:', error);
        // Only clear storage if token was invalid/expired (401)
        const isUnauthorized = error?.statusCode === 401 || error?.response?.status === 401;
        if (isUnauthorized) {
          storage.clearAuth();
          setUser(null);
          setAuthStatus('unauthenticated');
        }
      }
    };

    initAuth();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user: profile } = await userAPI.getProfile();
      setUser(profile);
      storage.setUser(profile);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    setAuthStatus('authenticated');
    storage.setUser(userData);
  }, []);

  const logout = useCallback(() => {
    // Stop pushing to this device for the account being signed out. Grab the
    // bearer before clearing storage and hand it over explicitly — the request
    // interceptor reads storage, which is about to be empty. Not awaited: the
    // sign-out must feel instant, and the server evicts this token anyway the
    // next time it is registered against any account.
    releasePushTokenOnLogout(storage.getToken());

    storage.clearAuth();
    setUser(null);
    setAuthStatus('unauthenticated');
  }, []);

  const value = useMemo(
    () => ({
      user,
      authStatus,
      isLoggedIn: authStatus === 'authenticated',
      login,
      logout,
      refreshUser,
    }),
    [user, authStatus, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
