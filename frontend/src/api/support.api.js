import axiosInstance from './axios';

export const supportAPI = {
  // Support email / phone / WhatsApp / hours for both apps (public)
  getContacts: async () => axiosInstance.get('/support'),
};
