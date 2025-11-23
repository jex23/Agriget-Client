export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  CART: '/cart',
  ORDERS: '/orders',
  ORDER_PROOF: '/orders/:orderId/proof',
  PROFILE: '/profile',
  PRODUCT_DETAILS: '/product/:id',
  ADMIN: '/admin',
  ADMIN_PRODUCTS: '/admin/products',
  ADMIN_CART: '/admin/cart',
  ADMIN_USERS: '/admin/users',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_ORDER_PROOF: '/admin/orders/:orderId/proof',
  ADMIN_NOTIFICATIONS: '/admin/notifications'
} as const;