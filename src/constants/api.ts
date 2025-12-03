//export const API_BASE_URL = 'https://jamesgalos.shop/apiv1/agriget';
export const API_BASE_URL = 'http://127.0.0.1:5096';

export const API_ENDPOINTS = {
  // Auth endpoints
  login: `${API_BASE_URL}/login`,
  register: `${API_BASE_URL}/register`,
  user: `${API_BASE_URL}/user`,
  users: `${API_BASE_URL}/users`,
  userById: (id: number) => `${API_BASE_URL}/user/${id}`,
  changePassword: `${API_BASE_URL}/change-password`,

  // OTP endpoints
  requestOtp: `${API_BASE_URL}/request-otp`,
  verifyOtp: `${API_BASE_URL}/verify-otp`,
  resetPassword: `${API_BASE_URL}/reset-password`,
  
  // Product endpoints
  products: `${API_BASE_URL}/products`,
  product: (id: number) => `${API_BASE_URL}/products/${id}`,
  
  // Cart endpoints
  cart: `${API_BASE_URL}/cart`,
  cartAll: `${API_BASE_URL}/cartall`,
  cartItem: (productId: number) => `${API_BASE_URL}/cart/${productId}`,
  
  // Order endpoints
  orders: `${API_BASE_URL}/orders`,
  order: (id: number) => `${API_BASE_URL}/orders/${id}`,
  allOrders: `${API_BASE_URL}/orders/all`,
  
  // Image endpoints
  image: (filename: string) => `${API_BASE_URL}/images/${filename}`,
  
  // Notification endpoints
  notifications: `${API_BASE_URL}/notifications`,
  notificationById: (id: number) => `${API_BASE_URL}/notifications/${id}`,
  notificationsUnreadCount: `${API_BASE_URL}/notifications/unread/count`,

  // Order Proof endpoints
  orderProofs: `${API_BASE_URL}/order-proofs`,
  orderProofsByOrderId: (orderId: number) => `${API_BASE_URL}/order-proofs/${orderId}`,
  orderProofById: (proofId: number) => `${API_BASE_URL}/order-proofs/proof/${proofId}`,
  orderProofUpdate: (proofId: number) => `${API_BASE_URL}/order-proofs/${proofId}`,

  // Analytics endpoints
  analytics: {
    sales: `${API_BASE_URL}/analytics/sales`,
  },
} as const;