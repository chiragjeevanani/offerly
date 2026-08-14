import axiosInstance from './axios';
import { API_ENDPOINTS } from '../config/constants';

export const offerAPI = {
  // Unified customer feed (city-locked buckets)
  getFeed: async (params) => {
    return axiosInstance.get('/offers/feed', { params });
  },

  // Get all offers with optional filters
  getAll: async (params) => {
    return axiosInstance.get(API_ENDPOINTS.GET_OFFERS, { params });
  },
  
  // Get offer by ID
  getById: async (id) => {
    return axiosInstance.get(API_ENDPOINTS.GET_OFFER.replace(':id', id));
  },

  // Get merchant's own offers
  getMyOffers: async () => {
    try {
      const response = await axiosInstance.get('/offers/mine');
      return response; // axios interceptor already returns response.data
    } catch (error) {
      console.error('Get my offers error:', error);
      throw error;
    }
  },

  // Create new offer (supports both product and service offers)
  create: async (data) => {
    try {
      const response = await axiosInstance.post('/offers', data);
      return response; // axios interceptor already returns response.data
    } catch (error) {
      console.error('Create offer error:', error);
      throw error;
    }
  },

  // Update offer
  update: async (id, data) => {
    try {
      const response = await axiosInstance.put(`/offers/${id}`, data);
      return response; // axios interceptor already returns response.data
    } catch (error) {
      console.error('Update offer error:', error);
      throw error;
    }
  },

  // Delete offer
  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/offers/${id}`);
      return response; // axios interceptor already returns response.data
    } catch (error) {
      console.error('Delete offer error:', error);
      throw error;
    }
  }
};
