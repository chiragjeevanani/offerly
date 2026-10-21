import axiosInstance from './axios';

// Home delivery of product orders: customer checkout/tracking, store steps,
// the delivery partner app and the admin controls.
export const deliveryAPI = {
  // Public: is delivery on, fee, free-delivery minimum, free gift, payment modes
  getConfig: async () => axiosInstance.get('/delivery/config'),

  // Customer
  getPayment: async (orderId) => axiosInstance.post(`/delivery/orders/${orderId}/pay`),
  verifyPayment: async (orderId, razorpayResponse) =>
    axiosInstance.post(`/delivery/orders/${orderId}/verify-payment`, razorpayResponse),
  cancelOrder: async (orderId, reason = '') => axiosInstance.post(`/delivery/orders/${orderId}/cancel`, { reason }),

  // Store
  storeAccept: async (orderId) => axiosInstance.post(`/delivery/store/orders/${orderId}/accept`),
  storeReady: async (orderId) => axiosInstance.post(`/delivery/store/orders/${orderId}/ready`),
  storeReturned: async (orderId) => axiosInstance.post(`/delivery/store/orders/${orderId}/returned`),

  // Delivery partner
  registerPartner: async (verificationToken, data) =>
    axiosInstance.post('/auth/register-delivery-partner', { verificationToken, ...data }),
  getMe: async () => axiosInstance.get('/delivery/partner/me'),
  updateMe: async (data) => axiosInstance.put('/delivery/partner/me', data),
  updateDocuments: async (data) => axiosInstance.put('/delivery/partner/me/documents', data),
  getAvailable: async () => axiosInstance.get('/delivery/partner/available'),
  getMyOrders: async (scope = 'active') => axiosInstance.get('/delivery/partner/orders', { params: { scope } }),
  getOrder: async (orderId) => axiosInstance.get(`/delivery/partner/orders/${orderId}`),
  acceptOrder: async (orderId) => axiosInstance.post(`/delivery/partner/orders/${orderId}/accept`),
  releaseOrder: async (orderId) => axiosInstance.post(`/delivery/partner/orders/${orderId}/release`),
  pickupOrder: async (orderId) => axiosInstance.post(`/delivery/partner/orders/${orderId}/pickup`),
  returnOrder: async (orderId, reason, note = '') => axiosInstance.post(`/delivery/partner/orders/${orderId}/return`, { reason, note }),
  deliverOrder: async (orderId, otp, cashCollected) =>
    axiosInstance.post(`/delivery/partner/orders/${orderId}/deliver`, { otp, cashCollected }),

  // Admin
  getAdminSettings: async () => axiosInstance.get('/delivery/admin/settings'),
  updateAdminSettings: async (data) => axiosInstance.put('/delivery/admin/settings', data),
  getPartners: async (params = {}) => axiosInstance.get('/delivery/admin/partners', { params }),
  updatePartnerStatus: async (partnerId, status, reason = '') =>
    axiosInstance.put(`/delivery/admin/partners/${partnerId}/status`, { status, reason }),
  settlePartner: async (partnerId, note = '') => axiosInstance.post(`/delivery/admin/partners/${partnerId}/settle`, { note }),
  getAdminOrders: async (params = {}) => axiosInstance.get('/delivery/admin/orders', { params }),
  unassignOrder: async (orderId) => axiosInstance.post(`/delivery/admin/orders/${orderId}/unassign`),
  adminCancelOrder: async (orderId, reason) => axiosInstance.post(`/delivery/admin/orders/${orderId}/cancel`, { reason }),
  adminConfirmReturn: async (orderId) => axiosInstance.post(`/delivery/admin/orders/${orderId}/returned`),
  retryRefund: async (orderId) => axiosInstance.post(`/delivery/admin/orders/${orderId}/retry-refund`),
};
