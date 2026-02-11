import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { authApi } from './auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { ROLES } from '@/config/constants';
import type {
  LoginRequest,
  RegisterRequest,
  GoogleLoginRequest,
  VerifyEmailRequest,
  ResendOtpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from '../types/auth.type';

const getRedirectPath = (roles: string[]): string => {
  if (roles.includes(ROLES.ADMIN)) return '/admin/dashboard';
  if (roles.includes(ROLES.CONTENT_MODERATOR)) return '/moderator/reviews';
  if (roles.includes(ROLES.PARTNER)) return '/partner/dashboard';
  return '/trips';
};

export const useLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { t } = useTranslation('auth');

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: ({ data }) => {
      login({
        id: data.userId,
        fullName: data.fullName,
        email: data.email,
        roles: data.roles,
        hasPassword: data.hasPassword,
        hasGoogleLinked: data.hasGoogleLinked,
      });
      message.success(t('signIn.success'));
      navigate(getRedirectPath(data.roles));
    },
    onError: () => {
      message.error(t('signIn.error'));
    },
  });
};

export const useRegister = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (_, variables) => {
      message.success(t('signUp.success'));
      navigate('/verify-email', { state: { email: variables.email } });
    },
    onError: () => {
      message.error(t('signUp.error'));
    },
  });
};

export const useGoogleLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { t } = useTranslation('auth');

  return useMutation({
    mutationFn: (data: GoogleLoginRequest) => authApi.googleLogin(data),
    onSuccess: ({ data }) => {
      login({
        id: data.userId,
        fullName: data.fullName,
        email: data.email,
        roles: data.roles,
        hasPassword: data.hasPassword,
        hasGoogleLinked: data.hasGoogleLinked,
      });
      message.success(t('signIn.success'));
      navigate(getRedirectPath(data.roles));
    },
    onError: () => {
      message.error(t('google.error'));
    },
  });
};

export const useVerifyEmail = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  return useMutation({
    mutationFn: (data: VerifyEmailRequest) => authApi.verifyEmail(data),
    onSuccess: () => {
      message.success(t('verifyEmail.success'));
      navigate('/login');
    },
    onError: () => {
      message.error(t('verifyEmail.error'));
    },
  });
};

export const useResendOtp = () => {
  const { t } = useTranslation('auth');

  return useMutation({
    mutationFn: (data: ResendOtpRequest) => authApi.resendOtp(data),
    onSuccess: () => {
      message.success(t('verifyEmail.resendSuccess'));
    },
    onError: () => {
      message.error(t('verifyEmail.resendError'));
    },
  });
};

export const useForgotPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  return useMutation({
    mutationFn: (data: ForgotPasswordRequest) => authApi.forgotPassword(data),
    onSuccess: (_, variables) => {
      message.success(t('forgotPassword.success'));
      navigate('/reset-password', { state: { email: variables.email } });
    },
    onError: () => {
      message.error(t('forgotPassword.error'));
    },
  });
};

export const useResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => authApi.resetPassword(data),
    onSuccess: () => {
      message.success(t('resetPassword.success'));
      navigate('/login');
    },
    onError: () => {
      message.error(t('resetPassword.error'));
    },
  });
};

export const useChangePassword = () => {
  const { t } = useTranslation('auth');

  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => authApi.changePassword(data),
    onSuccess: () => {
      message.success(t('changePassword.success'));
    },
    onError: () => {
      message.error(t('changePassword.error'));
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout();
      window.location.href = '/login';
    },
    onError: () => {
      // Force logout even on error
      logout();
      window.location.href = '/login';
    },
  });
};
