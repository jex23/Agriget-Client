import type { 
  UserResponse, 
  UserUpdate, 
  MessageResponse 
} from '../types/users.js';
import type { ChangePasswordRequest } from '../types/auth.js';
import { API_ENDPOINTS } from '../constants/api';

class AdminUserService {
  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> {
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token exists
    const token = this.getToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  async getAllUsers(): Promise<UserResponse[]> {
    return await this.makeRequest<UserResponse[]>(API_ENDPOINTS.users, {
      method: 'GET',
    });
  }

  async updateUser(userId: number, userUpdate: UserUpdate): Promise<MessageResponse> {
    return await this.makeRequest<MessageResponse>(API_ENDPOINTS.userById(userId), {
      method: 'PUT',
      body: JSON.stringify(userUpdate),
    });
  }

  async deleteUser(userId: number): Promise<MessageResponse> {
    return await this.makeRequest<MessageResponse>(API_ENDPOINTS.userById(userId), {
      method: 'DELETE',
    });
  }

  async changePassword(passwordRequest: ChangePasswordRequest): Promise<MessageResponse> {
    return await this.makeRequest<MessageResponse>(API_ENDPOINTS.changePassword, {
      method: 'PUT',
      body: JSON.stringify(passwordRequest),
    });
  }
}

export default new AdminUserService();