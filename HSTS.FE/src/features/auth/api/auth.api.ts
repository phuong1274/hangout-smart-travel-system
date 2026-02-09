import api from '@/lib/axios';
import type { LoginRequest, RegisterRequest, AuthResponse } from '../types/auth.type';

export const authApi = {
  login: (data: LoginRequest) => api.post<AuthResponse>('/api/auth/login', data),

  register: (data: RegisterRequest) => api.post<AuthResponse>('/api/auth/register', data),

  loginWithGoogle: (idToken: string) =>
    api.post<AuthResponse>('/api/auth/google', { idToken }),

  getMe: () => api.get<AuthResponse['user']>('/api/auth/me'),
};
