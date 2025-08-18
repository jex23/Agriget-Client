export interface LoginCredentials {
  username: string; // Changed from email to username to match API
  password: string;
}

export interface RegisterCredentials {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string; // For frontend validation only
  gender?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  role?: string;
  status?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  name?: string; // Computed field for display (first_name + last_name)
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// API Response types matching the backend
export interface LoginResponse {
  message: string;
  access_token: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

export interface MessageResponse {
  message: string;
  user_id?: number;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  gender?: string;
  email?: string;
  password?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}