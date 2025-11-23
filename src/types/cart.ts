export interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  created_at: string;
  updated_at: string;
  product_name: string;
  product_price: number;
  product_image?: string;
  product_minimum_order?: number;
  product_unit?: string;
  product_category?: string;
  user_first_name: string;
  user_last_name: string;
  user_username: string;
  user_email: string;
  user_phone?: string;
  user_address?: string;
}

export interface CartCreate {
  product_id: number;
  quantity: number;
}

export interface CartUpdate {
  quantity: number;
}

export interface CartResponse extends CartItem {}

export interface CartSummary {
  total_items: number;
  total_price: number;
  items: CartItem[];
}