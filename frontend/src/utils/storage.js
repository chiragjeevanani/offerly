import { STORAGE_KEYS } from '../config/constants';

export const storage = {
  // Token management
  setToken: (token) => {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },
  
  getToken: () => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },
  
  removeToken: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  },
  
  // User data management
  setUser: (user) => {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  },
  
  getUser: () => {
    const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  },
  
  removeUser: () => {
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  },
  
  // Clear all auth data
  clearAuth: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  },
};
