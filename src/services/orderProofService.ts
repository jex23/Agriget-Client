import { API_ENDPOINTS } from '../constants/api';
import type {
  OrderProofResponse,
  CreateOrderProofRequest,
  UpdateOrderProofRequest
} from '../types/orderProof';

class OrderProofService {
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');

    const defaultHeaders: Record<string, string> = {};

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData - browser will set it automatically with boundary
    if (options.body && !(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
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

  async createOrderProof(data: CreateOrderProofRequest): Promise<OrderProofResponse> {
    const formData = new FormData();
    formData.append('order_id', data.order_id.toString());
    formData.append('image', data.image);
    if (data.remarks) {
      formData.append('remarks', data.remarks);
    }

    return this.makeRequest<OrderProofResponse>(API_ENDPOINTS.orderProofs, {
      method: 'POST',
      body: formData,
    });
  }

  async updateOrderProof(proofId: number, data: UpdateOrderProofRequest): Promise<OrderProofResponse> {
    const formData = new FormData();

    if (data.image) {
      formData.append('image', data.image);
    }
    if (data.remarks !== undefined) {
      formData.append('remarks', data.remarks);
    }

    return this.makeRequest<OrderProofResponse>(API_ENDPOINTS.orderProofUpdate(proofId), {
      method: 'PUT',
      body: formData,
    });
  }

  async getOrderProofs(orderId: number): Promise<OrderProofResponse[]> {
    return this.makeRequest<OrderProofResponse[]>(API_ENDPOINTS.orderProofsByOrderId(orderId), {
      method: 'GET',
    });
  }

  async getOrderProofById(proofId: number): Promise<OrderProofResponse> {
    return this.makeRequest<OrderProofResponse>(API_ENDPOINTS.orderProofById(proofId), {
      method: 'GET',
    });
  }
}

export const orderProofService = new OrderProofService();
