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

    console.log('[DEBUG] adminUserService.makeRequest: Request details:');
    console.log('  - URL:', url);
    console.log('  - Method:', config.method || 'GET');
    console.log('  - Headers:', config.headers);
    console.log('  - Body:', config.body || 'N/A');
    console.log('  - Has token:', !!token);

    try {
      console.log('[DEBUG] adminUserService.makeRequest: Sending request...');
      const response = await fetch(url, config);

      console.log('[DEBUG] adminUserService.makeRequest: Response received:');
      console.log('  - Status:', response.status);
      console.log('  - Status Text:', response.statusText);
      console.log('  - Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error('[DEBUG] adminUserService.makeRequest: Response NOT OK');
        console.error('  - Status:', response.status);
        console.error('  - Status Text:', response.statusText);

        const errorData = await response.json().catch(() => ({}));
        console.error('  - Error data:', errorData);

        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[DEBUG] adminUserService.makeRequest: Success! Response data:', data);
      return data;
    } catch (error) {
      console.error('[DEBUG] adminUserService.makeRequest: Exception caught');
      console.error('  - Error type:', error instanceof Error ? 'Error' : typeof error);
      console.error('  - Error message:', error instanceof Error ? error.message : error);
      console.error('  - Full error:', error);

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
    console.log('[DEBUG] adminUserService.getAllUsers: Called');
    console.log('  - Endpoint:', API_ENDPOINTS.users);
    console.log('  - Method: GET');

    return await this.makeRequest<UserResponse[]>(API_ENDPOINTS.users, {
      method: 'GET',
    });
  }

  async updateUser(userId: number, userUpdate: UserUpdate): Promise<MessageResponse> {
    console.log('[DEBUG] adminUserService.updateUser: Called');
    console.log('  - User ID:', userId);
    console.log('  - Endpoint:', API_ENDPOINTS.userById(userId));
    console.log('  - Method: PUT');
    console.log('  - Update data:', userUpdate);

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