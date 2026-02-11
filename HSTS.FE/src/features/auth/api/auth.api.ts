import api from '@/lib/axios';
import type {
  LoginRequest,
  RegisterRequest,
  GoogleLoginRequest,
  VerifyEmailRequest,
  ResendOtpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  AuthResponse,
  MessageResponse,
} from '../types/auth.type';

export const authApi = {
  register: (data: RegisterRequest) => api.post<MessageResponse>('/api/auth/register', data),

  verifyEmail: (data: VerifyEmailRequest) =>
    api.post<MessageResponse>('/api/auth/verify-email', data),

  resendOtp: (data: ResendOtpRequest) => api.post<MessageResponse>('/api/auth/resend-otp', data),

  login: (data: LoginRequest) => api.post<AuthResponse>('/api/auth/login', data),

  googleLogin: (data: GoogleLoginRequest) => api.post<AuthResponse>('/api/auth/google-login', data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    api.post<MessageResponse>('/api/auth/forgot-password', data),

  resetPassword: (data: ResetPasswordRequest) =>
    api.post<MessageResponse>('/api/auth/reset-password', data),

  refreshToken: () => api.post<AuthResponse>('/api/auth/refresh-token'),

  logout: () => api.post<MessageResponse>('/api/auth/logout'),

  changePassword: (data: ChangePasswordRequest) =>
    api.post<MessageResponse>('/api/auth/change-password', data),
};
