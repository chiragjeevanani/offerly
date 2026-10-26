import axiosInstance from './axios';

// The delivery API lives at /delivery and, identically, at /dlv. The Android
// app wrapper treats any request URL containing "/delivery/" as a login call
// (copies the whole response to native code and re-syncs tokens), which made
// the delivery app crawl inside the APK. So the web app always calls /dlv.
export const DLV = '/dlv';

// Home delivery of product orders: customer checkout/tracking, store steps,
// the delivery partner app and the admin controls.
export const deliveryAPI = {
  // Public: is delivery on, fee, free-delivery minimum, free gift, payment modes
  getConfig: async () => axiosInstance.get(`${DLV}/config`),

  // Customer
  getPayment: async (orderId) => axiosInstance.post(`${DLV}/orders/${orderId}/pay`),
  verifyPayment: async (orderId, razorpayResponse) =>
    axiosInstance.post(`${DLV}/orders/${orderId}/verify-payment`, razorpayResponse),
  cancelOrder: async (orderId, reason = '') => axiosInstance.post(`${DLV}/orders/${orderId}/cancel`, { reason }),

  // Store
  storeAccept: async (orderId) => axiosInstance.post(`${DLV}/store/orders/${orderId}/accept`),
  storeReady: async (orderId) => axiosInstance.post(`${DLV}/store/orders/${orderId}/ready`),
  storeReturned: async (orderId) => axiosInstance.post(`${DLV}/store/orders/${orderId}/returned`),

  // Delivery partner
  registerPartner: async (verificationToken, data) =>
    axiosInstance.post('/auth/register-delivery-partner', { verificationToken, ...data }),
  getMe: async () => axiosInstance.get(`${DLV}/partner/me`),
  updateMe: async (data) => axiosInstance.put(`${DLV}/partner/me`, data),
  updateDocuments: async (data) => axiosInstance.put(`${DLV}/partner/me/documents`, data),
  getAvailable: async () => axiosInstance.get(`${DLV}/partner/available`),
  getMyOrders: async (scope = 'active') => axiosInstance.get(`${DLV}/partner/orders`, { params: { scope } }),
  getOrder: async (orderId) => axiosInstance.get(`${DLV}/partner/orders/${orderId}`),
  acceptOrder: async (orderId) => axiosInstance.post(`${DLV}/partner/orders/${orderId}/accept`),
  releaseOrder: async (orderId) => axiosInstance.post(`${DLV}/partner/orders/${orderId}/release`),
  pickupOrder: async (orderId) => axiosInstance.post(`${DLV}/partner/orders/${orderId}/pickup`),
  declineOrder: async (orderId) => axiosInstance.post(`${DLV}/partner/orders/${orderId}/decline`),
  getWallet: async () => axiosInstance.get(`${DLV}/partner/wallet`),
  // amount omitted = everything available
  withdraw: async (amount) => axiosInstance.post(`${DLV}/partner/wallet/withdraw`, amount ? { amount } : {}),
  requestSupport: async (orderId, reason, note = '') => axiosInstance.post(`${DLV}/partner/orders/${orderId}/support`, { reason, note }),
  returnOrder: async (orderId, reason, note = '') => axiosInstance.post(`${DLV}/partner/orders/${orderId}/return`, { reason, note }),
  // collectedVia: 'cash' | 'upi' (only for cash-on-delivery orders)
  deliverOrder: async (orderId, otp, collectedVia) =>
    axiosInstance.post(`${DLV}/partner/orders/${orderId}/deliver`, { otp, collectedVia }),

  // Admin
  getAdminSettings: async () => axiosInstance.get(`${DLV}/admin/settings`),
  updateAdminSettings: async (data) => axiosInstance.put(`${DLV}/admin/settings`, data),
  getPartners: async (params = {}) => axiosInstance.get(`${DLV}/admin/partners`, { params }),
  updatePartnerStatus: async (partnerId, status, reason = '') =>
    axiosInstance.put(`${DLV}/admin/partners/${partnerId}/status`, { status, reason }),
  getPartnerShift: async (partnerId) => axiosInstance.get(`${DLV}/admin/partners/${partnerId}/shift`),
  updatePartnerShift: async (partnerId, shift) => axiosInstance.put(`${DLV}/admin/partners/${partnerId}/shift`, shift),
  getWithdrawals: async (status) => axiosInstance.get(`${DLV}/admin/withdrawals`, { params: status ? { status } : {} }),
  markWithdrawalPaid: async (id, reference) => axiosInstance.post(`${DLV}/admin/withdrawals/${id}/paid`, { reference }),
  rejectWithdrawal: async (id, reason) => axiosInstance.post(`${DLV}/admin/withdrawals/${id}/reject`, { reason }),
  settlePartner: async (partnerId, note = '') => axiosInstance.post(`${DLV}/admin/partners/${partnerId}/settle`, { note }),
  getAdminOrders: async (params = {}) => axiosInstance.get(`${DLV}/admin/orders`, { params }),
  unassignOrder: async (orderId) => axiosInstance.post(`${DLV}/admin/orders/${orderId}/unassign`),
  adminVerifyOrder: async (orderId) => axiosInstance.post(`${DLV}/admin/orders/${orderId}/verify`),
  adminCancelOrder: async (orderId, reason, keepFee = false) => axiosInstance.post(`${DLV}/admin/orders/${orderId}/cancel`, { reason, keepFee }),
  adminConfirmReturn: async (orderId) => axiosInstance.post(`${DLV}/admin/orders/${orderId}/returned`),
  retryRefund: async (orderId) => axiosInstance.post(`${DLV}/admin/orders/${orderId}/retry-refund`),
};
