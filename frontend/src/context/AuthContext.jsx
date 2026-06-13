import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

const TOKEN_KEY = 'tenora_token';
const USER_KEY = 'tenora_user';
const AUTH_MESSAGE_KEY = 'tenora_auth_message';

const getStoredAuthMessage = () => {
  const message = localStorage.getItem(AUTH_MESSAGE_KEY) || '';
  localStorage.removeItem(AUTH_MESSAGE_KEY);
  return message;
};

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
  const [accessStatus, setAccessStatus] = useState(null);
  const [accessError, setAccessError] = useState('');
  const [isAccessLoading, setIsAccessLoading] = useState(true);
  const [authError, setAuthError] = useState(getStoredAuthMessage);
  const shouldRunCountdown = Boolean(
    accessStatus
    && !accessStatus.isExpired
    && Number(accessStatus.remainingSeconds) > 0
  );

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
    setAuthError('');
  }, []);

  const refreshAccessStatus = useCallback(async () => {
    try {
      const response = await apiClient.get('/access/status');
      const nextStatus = response.data.data;

      setAccessStatus(nextStatus);
      setAccessError('');

      if (nextStatus.isExpired) {
        clearSession();
      }

      return nextStatus;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Access status could not be verified';
      setAccessError(message);

      if (error.response?.data?.code === 'ACCESS_CONFIG_INVALID') {
        clearSession();
      }

      throw error;
    } finally {
      setIsAccessLoading(false);
    }
  }, [clearSession]);

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
    const timeoutId = window.setTimeout(() => {
      refreshAccessStatus().catch(() => {});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshAccessStatus]);

  useEffect(() => {
    const handleAccessBlocked = (event) => {
      clearSession();
      setAccessError(event.detail?.message || 'Access period has expired. Please contact the administrator.');
      setAccessStatus((currentStatus) => ({
        ...(currentStatus || {}),
        isExpired: true,
        remainingSeconds: 0
      }));
      setIsAccessLoading(false);
    };

    window.addEventListener('tenora:access-blocked', handleAccessBlocked);
    return () => window.removeEventListener('tenora:access-blocked', handleAccessBlocked);
  }, [clearSession]);

  useEffect(() => {
    if (!shouldRunCountdown) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setAccessStatus((currentStatus) => {
        if (!currentStatus || currentStatus.isExpired) return currentStatus;

        const remainingSeconds = Math.max(0, Number(currentStatus.remainingSeconds || 0) - 1);
        return {
          ...currentStatus,
          remainingSeconds,
          isExpired: remainingSeconds === 0
        };
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [shouldRunCountdown]);

  useEffect(() => {
    if (!accessStatus?.isExpired) return;

    const timeoutId = window.setTimeout(() => {
      clearSession();
      setAccessError('Access period has expired. Please contact the administrator.');
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [accessStatus?.isExpired, clearSession]);

  useEffect(() => {
    const syncIntervalId = window.setInterval(() => {
      refreshAccessStatus().catch(() => {});
    }, 60000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAccessStatus().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(syncIntervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshAccessStatus]);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    accessStatus,
    accessError,
    authError,
    isAccessExpired: Boolean(accessStatus?.isExpired),
    isAccessLoading,
    isAuthenticated: Boolean(token && user && accessStatus && !accessStatus.isExpired),
    isBootstrapping,
    login,
    logout: clearSession,
    refreshUser,
    refreshAccessStatus
  }), [
    accessError,
    accessStatus,
    authError,
    clearSession,
    isAccessLoading,
    isBootstrapping,
    login,
    refreshAccessStatus,
    refreshUser,
    token,
    user
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};
