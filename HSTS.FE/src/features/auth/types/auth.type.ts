import type { Role } from '@/config/constants';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    avatar?: string;
    role: Role;
  };
}
