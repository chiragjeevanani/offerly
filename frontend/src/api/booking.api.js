import axiosInstance from './axios';
import { API_ENDPOINTS } from '../config/constants';

export const bookingAPI = {
  // Create redemption
  create: async (data) => {
    return axiosInstance.post(API_ENDPOINTS.CREATE_REDEMPTION, data);
  },
  
  // Get customer redemptions
  getCustomerRedemptions: async () => {
    return axiosInstance.get(API_ENDPOINTS.GET_REDEMPTIONS);
  },
  
  // Get single redemption
  getById: async (id) => {
    return axiosInstance.get(`${API_ENDPOINTS.CREATE_REDEMPTION}/${id}`);
  },
  
  // Verify QR (merchant)
  verifyQR: async (qrToken) => {
    return axiosInstance.post(API_ENDPOINTS.VERIFY_QR, { qrToken });
  },

  // Preview QR without fulfilling (merchant)
  previewQR: async (qrToken) => {
    return axiosInstance.post(`${API_ENDPOINTS.CREATE_REDEMPTION}/preview-qr`, { qrToken });
  },

  // Get merchant redemptions
  getMerchantRedemptions: async () => {
    return axiosInstance.get(`${API_ENDPOINTS.CREATE_REDEMPTION}/merchant`);
  },

  // Lookup by Pass ID (merchant manual entry)
  lookupByPassId: async (internalId) => {
    return axiosInstance.get(`${API_ENDPOINTS.CREATE_REDEMPTION}/lookup/${internalId}`);
  },
};
