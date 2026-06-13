import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('tenora_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    const errorCode = error.response?.data?.code;
    const sessionBlockedCodes = ['ACCOUNT_DISABLED', 'ACCOUNT_NOT_FOUND', 'TOKEN_REVOKED', 'TOKEN_INVALID'];

    if (errorCode === 'ACCESS_EXPIRED' || errorCode === 'ACCESS_CONFIG_INVALID') {
      localStorage.removeItem('tenora_token');
      localStorage.removeItem('tenora_user');
      window.dispatchEvent(new CustomEvent('tenora:access-blocked', {
        detail: {
          code: errorCode,
          message: error.response?.data?.message
        }
      }));
    } else if (
      !isLoginRequest
      && (error.response?.status === 401 || sessionBlockedCodes.includes(errorCode))
    ) {
      localStorage.removeItem('tenora_token');
      localStorage.removeItem('tenora_user');
      localStorage.setItem(
        'tenora_auth_message',
        error.response?.data?.message || 'Your session is no longer valid. Please sign in again.'
      );

      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
