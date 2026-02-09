import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { authApi } from './auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { ROLES } from '@/config/constants';
import type { LoginRequest, RegisterRequest } from '../types/auth.type';

const getRedirectPath = (role: string): string => {
  switch (role) {
    case ROLES.ADMIN:
      return '/admin/dashboard';
    case ROLES.MODERATOR:
      return '/moderator/reviews';
    case ROLES.PARTNER:
      return '/partner/dashboard';
    default:
      return '/trips';
  }
};

export const useLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: ({ data }) => {
      login(data.accessToken, data.user);
      message.success('Login successful!');
      navigate(getRedirectPath(data.user.role));
    },
    onError: () => {
      message.error('Invalid email or password.');
    },
  });
};

export const useRegister = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: ({ data }) => {
      login(data.accessToken, data.user);
      message.success('Registration successful!');
      navigate('/trips');
    },
    onError: () => {
      message.error('Registration failed. Please try again.');
    },
  });
};

export const useGoogleLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: (idToken: string) => authApi.loginWithGoogle(idToken),
    onSuccess: ({ data }) => {
      login(data.accessToken, data.user);
      message.success('Login successful!');
      navigate(getRedirectPath(data.user.role));
    },
    onError: () => {
      message.error('Google login failed.');
    },
  });
};
