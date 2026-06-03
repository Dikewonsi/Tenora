import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

const TOKEN_KEY = 'tenora_token';
const USER_KEY = 'tenora_user';

const getStoredUser = () => {
  const storedUser = localStorage.getItem(USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(getStoredUser);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const setSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const nextToken = response.data.data.token;
    const nextUser = response.data.data.user;

    setSession(nextToken, nextUser);

    return nextUser;
  }, [setSession]);

  const refreshUser = useCallback(async () => {
    const response = await apiClient.get('/auth/me');
    const nextUser = response.data.data.user;

    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);

    return nextUser;
  }, []);

  useEffect(() => {
    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    let isMounted = true;

    refreshUser()
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [clearSession, refreshUser, token]);

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isBootstrapping,
    login,
    logout: clearSession,
    refreshUser
  }), [clearSession, isBootstrapping, login, refreshUser, token, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};
