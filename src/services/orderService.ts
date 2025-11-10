import { API_ENDPOINTS } from '../constants/api';
import type { 
  CreateOrderRequest, 
  UpdateOrderRequest,
  OrderResponse 
} from '../types/order';

class OrderService {
  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async createOrder(orderData: CreateOrderRequest): Promise<OrderResponse> {
    console.log('📤 [OrderService] Creating order:', orderData);
    const response = await this.makeRequest<OrderResponse>(API_ENDPOINTS.orders, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    console.log('✅ [OrderService] Order created successfully:', response);
    console.log('🔍 [OrderService] Stock should be decreased on backend for product_id:', orderData.product_id);
    return response;
  }

  async getUserOrders(): Promise<OrderResponse[]> {
    return this.makeRequest<OrderResponse[]>(API_ENDPOINTS.orders, {
      method: 'GET',
    });
  }

  async getAllOrders(): Promise<OrderResponse[]> {
    return this.makeRequest<OrderResponse[]>(API_ENDPOINTS.allOrders, {
      method: 'GET',
    });
  }

  async getOrder(id: number): Promise<OrderResponse> {
    return this.makeRequest<OrderResponse>(API_ENDPOINTS.order(id), {
      method: 'GET',
    });
  }

  async updateOrder(id: number, orderData: UpdateOrderRequest): Promise<OrderResponse> {
    return this.makeRequest<OrderResponse>(API_ENDPOINTS.order(id), {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
  }

  async cancelOrder(id: number): Promise<OrderResponse> {
    return this.makeRequest<OrderResponse>(API_ENDPOINTS.order(id), {
      method: 'PUT',
      body: JSON.stringify({ order_status: 'canceled' }),
    });
  }

  async getPendingOrdersCount(): Promise<{ count: number }> {
    // Get all orders and filter for pending ones
    // This could be optimized with a specific API endpoint if needed
    try {
      const allOrders = await this.getAllOrders();
      const pendingCount = allOrders.filter(order => order.order_status === 'pending').length;
      return { count: pendingCount };
    } catch (error) {
      console.error('Error fetching pending orders count:', error);
      return { count: 0 };
    }
  }
}

export const orderService = new OrderService();