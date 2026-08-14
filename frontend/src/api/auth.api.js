import axiosInstance from './axios';
import { API_ENDPOINTS } from '../config/constants';

export const authAPI = {
  // Send OTP
  sendOtp: async (phone, role, purpose) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return axiosInstance.post(API_ENDPOINTS.SEND_OTP, {
      phone: cleanPhone,
      role, // 'customer' or 'merchant'
      purpose, // 'login' or 'register'
    });
  },
  
  // Verify OTP
  verifyOtp: async (phone, role, purpose, otp) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return axiosInstance.post(API_ENDPOINTS.VERIFY_OTP, {
      phone: cleanPhone,
      role,
      purpose,
      otp,
    });
  },
  
  // Register Customer
  registerCustomer: async (verificationToken, userData) => {
    return axiosInstance.post(API_ENDPOINTS.REGISTER_CUSTOMER, {
      verificationToken,
      ...userData,
    });
  },
  
  // Register Merchant User
  registerMerchant: async (verificationToken, userData) => {
    return axiosInstance.post(API_ENDPOINTS.REGISTER_MERCHANT, {
      verificationToken,
      ...userData,
    });
  },
  
  // Admin Login
  adminLogin: async (email, password) => {
    return axiosInstance.post(API_ENDPOINTS.ADMIN_LOGIN, {
      email,
      password,
    });
  },
};
