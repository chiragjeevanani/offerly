import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../../../utils/storage';
import { userAPI } from '../../../api/user.api';

const AuthContext = createContext(null);

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
        setUser(profile);
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
    storage.clearAuth();
    setUser(null);
    setAuthStatus('unauthenticated');
  }, []);

  const value = {
    user,
    authStatus,
    isLoggedIn: authStatus === 'authenticated',
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
