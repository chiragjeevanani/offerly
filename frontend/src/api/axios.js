import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../config/constants';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // Ignore 401 on login/auth verification requests so the UI can display normal error messages
    const isAuthEndpoint = url.includes('/auth/login') ||
                           url.includes('/auth/send-otp') ||
                           url.includes('/auth/verify-otp') ||
                           url.includes('/auth/admin-login');

    if (status === 401 && !isAuthEndpoint) {
      const currentToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (currentToken) {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);

        const pathname = window.location.pathname;
        if (pathname.startsWith('/admin') && !pathname.includes('/login')) {
          window.location.href = '/admin/login';
        } else if (pathname.startsWith('/merchant') && !pathname.includes('/login') && !pathname.includes('/signup')) {
          window.location.href = '/merchant/login';
        } else if (!pathname.startsWith('/login') && !pathname.startsWith('/signup') && !pathname.startsWith('/verify')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default axiosInstance;
