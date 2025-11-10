export const API_BASE_URL = 'http://127.0.0.1:8000';

export const API_ENDPOINTS = {
  // Auth endpoints
  login: `${API_BASE_URL}/login`,
  register: `${API_BASE_URL}/register`,
  user: `${API_BASE_URL}/user`,
  users: `${API_BASE_URL}/users`,
  userById: (id: number) => `${API_BASE_URL}/user/${id}`,
  changePassword: `${API_BASE_URL}/change-password`,
  
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
} as const;