// User types
export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'non-binary';
  email?: string;
  password?: string;
  username?: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'disable';
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UserResponse {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'non-binary';
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
  last_logon: string | null;
  status: 'active' | 'disable';
}

export interface MessageResponse {
  message: string;
}
