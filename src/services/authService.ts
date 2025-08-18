import type { 
  LoginCredentials, 
  RegisterCredentials, 
  AuthResponse, 
  User, 
  LoginResponse, 
  MessageResponse,
  UserUpdate,
  ChangePasswordRequest 
} from '../types/auth.js';
import { API_ENDPOINTS } from '../constants/api';

class AuthService {
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

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.makeRequest<LoginResponse>(API_ENDPOINTS.login, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Transform the API response to match our AuthResponse interface
    const user: User = {
      id: response.user.id,
      username: response.user.username,
      email: response.user.email,
      first_name: response.user.first_name,
      last_name: response.user.last_name,
      role: response.user.role,
      name: `${response.user.first_name} ${response.user.last_name}`.trim()
    };

    const authResponse: AuthResponse = {
      user,
      token: response.access_token,
      message: response.message
    };

    // Store authentication data
    localStorage.setItem('token', authResponse.token);
    localStorage.setItem('user', JSON.stringify(authResponse.user));

    return authResponse;
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    // Prepare the registration data for the API
    const registrationData = {
      first_name: credentials.first_name,
      last_name: credentials.last_name,
      username: credentials.username,
      email: credentials.email,
      password: credentials.password,
      gender: credentials.gender,
      phone: credentials.phone || null,
      address: credentials.address || null,
      date_of_birth: credentials.date_of_birth || null,
      role: credentials.role || 'user',
      status: credentials.status || 'active'
    };

    const response = await this.makeRequest<MessageResponse>(API_ENDPOINTS.register, {
      method: 'POST',
      body: JSON.stringify(registrationData),
    });

    // After successful registration, auto-login the user
    const loginCredentials: LoginCredentials = {
      username: credentials.username,
      password: credentials.password
    };

    return await this.login(loginCredentials);
  }

  async updateUser(userUpdate: UserUpdate): Promise<MessageResponse> {
    return await this.makeRequest<MessageResponse>(API_ENDPOINTS.user, {
      method: 'PUT',
      body: JSON.stringify(userUpdate),
    });
  }

  async changePassword(passwordRequest: ChangePasswordRequest): Promise<MessageResponse> {
    return await this.makeRequest<MessageResponse>(API_ENDPOINTS.changePassword, {
      method: 'PUT',
      body: JSON.stringify(passwordRequest),
    });
  }

  async deleteUser(): Promise<MessageResponse> {
    const response = await this.makeRequest<MessageResponse>(API_ENDPOINTS.user, {
      method: 'DELETE',
    });

    // Clear local storage after successful deletion
    this.logout();
    
    return response;
  }

  async deleteUserById(userId: number): Promise<MessageResponse> {
    return await this.makeRequest<MessageResponse>(API_ENDPOINTS.userById(userId), {
      method: 'DELETE',
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Utility method to refresh user data from storage
  refreshUser(): void {
    const user = this.getCurrentUser();
    if (user && user.first_name && user.last_name) {
      user.name = `${user.first_name} ${user.last_name}`.trim();
      localStorage.setItem('user', JSON.stringify(user));
    }
  }
}

export default new AuthService();