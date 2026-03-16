import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { authApi } from '../api';
import { useAuthStore } from '@/store/authStore';
import { ROLES } from '@/config/constants';
import { PATHS } from '@/routes/paths';

const getRedirectPath = (roles) => {
  if (roles.includes(ROLES.ADMIN)) return '/users';
  if (roles.includes(ROLES.CONTENT_MODERATOR)) return '/';
  if (roles.includes(ROLES.PARTNER)) return '/';
  return '/';
};

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const loginFn = useCallback(async (data) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      login({
        id: res.data.userId,
        fullName: res.data.fullName,
        email: res.data.email,
        roles: res.data.roles,
        hasPassword: res.data.hasPassword,
        hasGoogleLinked: res.data.hasGoogleLinked,
      });
      message.success('Login successful!');
      navigate(getRedirectPath(res.data.roles));
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'Account.EmailNotVerified') {
        const msg = err?.response?.data?.message || 'Please verify your email first.';
        message.warning(msg);
        navigate(PATHS.AUTH.VERIFY_EMAIL, { state: { email: data.email } });
        return;
      }
      // Other errors shown by axios interceptor
    } finally {
      setLoading(false);
    }
  }, [login, navigate]);

  return { login: loginFn, loading };
};

export const useRegister = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const register = useCallback(async (data) => {
    setLoading(true);
    try {
      await authApi.register(data);
      message.success('Registration successful! Please verify your email.');
      navigate(PATHS.AUTH.VERIFY_EMAIL, { state: { email: data.email } });
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return { register, loading };
};

export const useVerifyEmail = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const verifyEmail = useCallback(async (data) => {
    setLoading(true);
    try {
      await authApi.verifyEmail(data);
      message.success('Email verified! You can now log in.');
      navigate(PATHS.AUTH.LOGIN);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return { verifyEmail, loading };
};

export const useResendOtp = () => {
  const [loading, setLoading] = useState(false);

  const resendOtp = useCallback(async (data) => {
    setLoading(true);
    try {
      const res = await authApi.resendOtp(data);
      message.success('OTP resent!');
      return res.data;
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  return { resendOtp, loading };
};

export const useForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const forgotPassword = useCallback(async (data) => {
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(data);
      message.success('OTP sent to your email.');
      navigate(PATHS.AUTH.RESET_PASSWORD, {
        state: {
          email: data.email,
          remainingResends: res.data.remainingResends,
          cooldownSeconds: res.data.cooldownSeconds,
        },
      });
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return { forgotPassword, loading };
};

export const useVerifyForgotPasswordOtp = () => {
  const [loading, setLoading] = useState(false);

  const verifyForgotPasswordOtp = useCallback(async (data) => {
    setLoading(true);
    try {
      await authApi.verifyForgotPasswordOtp(data);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { verifyForgotPasswordOtp, loading };
};

export const useResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const resetPassword = useCallback(async (data, { onError } = {}) => {
    setLoading(true);
    try {
      await authApi.resetPassword(data);
      message.success('Password reset successful!');
      navigate(PATHS.AUTH.LOGIN);
    } catch (err) {
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return { resetPassword, loading };
};

export const useChangePassword = () => {
  const [loading, setLoading] = useState(false);

  const changePassword = useCallback(async (data, { onSuccess } = {}) => {
    setLoading(true);
    try {
      await authApi.changePassword(data);
      message.success('Password changed successfully!');
      onSuccess?.();
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  return { changePassword, loading };
};

export const useGoogleLogin = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const googleLogin = useCallback(async (googleIdToken) => {
    setLoading(true);
    try {
      const res = await authApi.googleLogin({ googleIdToken });
      login({
        id: res.data.userId,
        fullName: res.data.fullName,
        email: res.data.email,
        roles: res.data.roles,
        hasPassword: res.data.hasPassword,
        hasGoogleLinked: res.data.hasGoogleLinked,
      });
      message.success('Login successful!');
      navigate(getRedirectPath(res.data.roles));
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [login, navigate]);

  return { googleLogin, loading };
};

export const useLogout = () => {
  const { logout } = useAuthStore();

  const logoutFn = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      window.location.href = PATHS.AUTH.LOGIN;
    }
  }, [logout]);

  return { logout: logoutFn };
};
