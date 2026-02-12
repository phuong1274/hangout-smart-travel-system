import { useCallback } from 'react';
import { Card, Typography } from 'antd';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useVerifyEmail, useResendOtp } from '../api/auth.query';
import { OtpVerificationStep } from './OtpVerificationStep';
import type { OtpSendResponse } from '../types/auth.type';

const { Title } = Typography;

export const VerifyEmailForm = () => {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email;
  const { t } = useTranslation('auth');

  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendOtp();

  const handleSubmitOtp = useCallback(
    (otpCode: string) => {
      if (email) {
        verifyMutation.mutate({ email, otpCode });
      }
    },
    [email, verifyMutation],
  );

  const handleResendOtp = useCallback(async (): Promise<OtpSendResponse> => {
    if (!email) throw new Error('Email is missing');
    const response = await resendMutation.mutateAsync({
      email,
      type: 'EmailVerification',
    });
    return response.data;
  }, [email, resendMutation]);

  if (!email) {
    return <Navigate to="/register" replace />;
  }

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>{t('verifyEmail.title')}</Title>
      </div>

      <OtpVerificationStep
        email={email}
        onSubmitOtp={handleSubmitOtp}
        onResendOtp={handleResendOtp}
        isSubmitting={verifyMutation.isPending}
        isResending={resendMutation.isPending}
      />

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/login">{t('verifyEmail.backToLogin')}</Link>
      </div>
    </Card>
  );
};
