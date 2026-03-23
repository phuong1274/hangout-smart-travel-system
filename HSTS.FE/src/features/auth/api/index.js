import apiClient from '@/lib/axios';

export const authApi = {
  register: (data) => apiClient.post('/api/auth/register', data),
  verifyEmail: (data) => apiClient.post('/api/auth/verify-email', data),
  resendOtp: (data) => apiClient.post('/api/auth/resend-otp', data),
  login: (data) => apiClient.post('/api/auth/login', data),
  forgotPassword: (data) => apiClient.post('/api/auth/forgot-password', data),
  verifyForgotPasswordOtp: (data) => apiClient.post('/api/auth/verify-forgot-password-otp', data),
  resetPassword: (data) => apiClient.post('/api/auth/reset-password', data),
  refreshToken: () => apiClient.post('/api/auth/refresh-token'),
  logout: () => apiClient.post('/api/auth/logout'),
  changePassword: (data) => apiClient.post('/api/auth/change-password', data),
  googleLogin: (data) => apiClient.post('/api/auth/google-login', data),
};
