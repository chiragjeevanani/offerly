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
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      // Redirect admin to admin login, others to customer login
      const isAdmin = window.location.pathname.startsWith('/admin');
      window.location.href = isAdmin ? '/admin/login' : '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default axiosInstance;
