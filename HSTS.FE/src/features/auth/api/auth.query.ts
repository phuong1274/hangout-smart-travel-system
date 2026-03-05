import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { authApi } from './auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { ROLES } from '@/config/constants';
import { useMessage } from '@/hooks/useMessage';
import type {
  LoginRequest,
  RegisterRequest,
  GoogleLoginRequest,
  VerifyEmailRequest,
  ResendOtpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  OtpSendResponse,
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
  const messageApi = useMessage();

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
      messageApi.success(t('signIn.success'));
      navigate(getRedirectPath(data.roles));
    },
    onError: (error: AxiosError<{ code?: string; message?: string }>, variables) => {
      const errorCode = error.response?.data?.code;

      if (errorCode === 'Account.EmailNotVerified') {
        messageApi.warning(t('signIn.emailNotVerified'));
        navigate('/verify-email', { state: { email: variables.email } });
        return;
      }

      messageApi.error(t('signIn.error'));
    },
  });
};

export const useRegister = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const messageApi = useMessage();

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (_, variables) => {
      messageApi.success(t('signUp.success'));
      navigate('/verify-email', { state: { email: variables.email } });
    },
    onError: () => {
      messageApi.error(t('signUp.error'));
    },
  });
};

export const useGoogleLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { t } = useTranslation('auth');
  const messageApi = useMessage();

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
      messageApi.success(t('signIn.success'));
      navigate(getRedirectPath(data.roles));
    },
    onError: () => {
      messageApi.error(t('google.error'));
    },
  });
};

export const useVerifyEmail = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const messageApi = useMessage();

  return useMutation({
    mutationFn: (data: VerifyEmailRequest) => authApi.verifyEmail(data),
    onSuccess: () => {
      messageApi.success(t('verifyEmail.success'));
      navigate('/login');
    },
    onError: () => {
      messageApi.error(t('verifyEmail.error'));
    },
  });
};

export const useResendOtp = (onResendSuccess?: (data: OtpSendResponse) => void) => {
  const { t } = useTranslation('auth');
  const messageApi = useMessage();

  return useMutation({
    mutationFn: (data: ResendOtpRequest) => authApi.resendOtp(data),
    onSuccess: ({ data }) => {
      messageApi.success(t('verifyEmail.resendSuccess'));
      onResendSuccess?.(data);
    },
    onError: () => {
      messageApi.error(t('verifyEmail.resendError'));
    },
  });
};

export const useForgotPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const messageApi = useMessage();

  return useMutation({
    mutationFn: (data: ForgotPasswordRequest) => authApi.forgotPassword(data),
    onSuccess: ({ data }, variables) => {
      messageApi.success(t('forgotPassword.success'));
      navigate('/reset-password', {
        state: {
          email: variables.email,
          remainingResends: data.remainingResends,
          cooldownSeconds: data.cooldownSeconds,
        },
      });
    },
    onError: () => {
      messageApi.error(t('forgotPassword.error'));
    },
  });
};

export const useResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const messageApi = useMessage();

  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => authApi.resetPassword(data),
    onSuccess: () => {
      messageApi.success(t('resetPassword.success'));
      navigate('/login');
    },
    onError: () => {
      messageApi.error(t('resetPassword.error'));
    },
  });
};

export const useChangePassword = () => {
  const { t } = useTranslation('auth');
  const messageApi = useMessage();

  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => authApi.changePassword(data),
    onSuccess: () => {
      messageApi.success(t('changePassword.success'));
    },
    onError: () => {
      messageApi.error(t('changePassword.error'));
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
