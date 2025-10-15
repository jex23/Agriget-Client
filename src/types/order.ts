// Enum types matching database schema
export type PaymentTerms = 'cash_on_delivery' | 'over_the_counter';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type OrderStatus = 'pending' | 'processing' | 'on_delivery' | 'completed' | 'canceled';

export interface Order {
  id: number;
  order_number: string;
  user_id: number;
  product_id: number;
  quantity: number; // decimal(10,2) from database
  total_amount: number; // decimal(10,2) from database
  payment_terms: PaymentTerms;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  shipping_address?: string;
  shipping_fee?: number; // decimal(10,2) from database
  free_shipping?: boolean;
  created_at: string;
  updated_at: string;

  // Product details (from JOIN)
  product_name?: string;
  product_price?: number;
  product_image?: string;

  // User details (from JOIN, available for admin)
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
  user_phone?: string;
}

export interface CreateOrderRequest {
  product_id: number;
  quantity?: number; // defaults to 1.0 in database
  payment_terms: PaymentTerms;
  shipping_address?: string;
  shipping_fee?: number; // defaults to 0.0 in database
  free_shipping?: boolean; // defaults to false in database
}

export interface UpdateOrderRequest {
  quantity?: number;
  payment_terms?: PaymentTerms;
  payment_status?: PaymentStatus;
  order_status?: OrderStatus;
  shipping_address?: string;
  shipping_fee?: number;
  free_shipping?: boolean;
}

export interface OrderResponse extends Order {}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}