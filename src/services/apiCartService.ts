import { API_ENDPOINTS } from '../constants/api';
import type { 
  CartItem, 
  CartCreate, 
  CartUpdate,
  CartSummary
} from '../types/cart';

class ApiCartService {
  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> {
    console.log('🌐 [ApiCartService] Making request to:', url);
    console.log('🌐 [ApiCartService] Options:', options);
    
    const token = localStorage.getItem('token');
    console.log('🌐 [ApiCartService] Token:', token ? 'Present' : 'Missing');
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const requestConfig = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };
    
    console.log('🌐 [ApiCartService] Request config:', requestConfig);

    const response = await fetch(url, requestConfig);
    
    console.log('🌐 [ApiCartService] Response status:', response.status);
    console.log('🌐 [ApiCartService] Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('🌐 [ApiCartService] Error response:', errorData);
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('🌐 [ApiCartService] Success response:', result);
    return result;
  }

  async addToCart(cartItem: CartCreate): Promise<{ message: string }> {
    console.log('🛒 [ApiCartService] addToCart called with:', cartItem);
    console.log('🛒 [ApiCartService] API_ENDPOINTS.cart:', API_ENDPOINTS.cart);
    
    return this.makeRequest<{ message: string }>(API_ENDPOINTS.cart, {
      method: 'POST',
      body: JSON.stringify(cartItem),
    });
  }

  async getCart(): Promise<CartItem[]> {
    console.log('🛒 [ApiCartService] getCart called');
    console.log('🛒 [ApiCartService] API_ENDPOINTS.cart:', API_ENDPOINTS.cart);
    
    return this.makeRequest<CartItem[]>(API_ENDPOINTS.cart, {
      method: 'GET',
    });
  }

  async updateCartItem(productId: number, cartUpdate: CartUpdate): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(API_ENDPOINTS.cartItem(productId), {
      method: 'PUT',
      body: JSON.stringify(cartUpdate),
    });
  }

  async removeFromCart(productId: number): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(API_ENDPOINTS.cartItem(productId), {
      method: 'DELETE',
    });
  }

  async clearCart(): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(API_ENDPOINTS.cart, {
      method: 'DELETE',
    });
  }

  // Helper methods for cart calculations
  calculateCartSummary(cartItems: CartItem[]): CartSummary {
    const total_items = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const total_price = cartItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
    
    return {
      total_items,
      total_price,
      items: cartItems,
    };
  }

  // Get cart item by product ID
  getCartItemByProductId(cartItems: CartItem[], productId: number): CartItem | undefined {
    return cartItems.find(item => item.product_id === productId);
  }
}

export const apiCartService = new ApiCartService();