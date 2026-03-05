import { useState, useCallback } from 'react';
import { Button, Card, Form, Input, Typography } from 'antd';
import { ArrowLeftOutlined, LockOutlined } from '@ant-design/icons';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useResetPassword, useResendOtp } from '../api/auth.query';
import { OtpVerificationStep } from './OtpVerificationStep';
import type { OtpSendResponse } from '../types/auth.type';

const { Title, Text } = Typography;

interface PasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

interface LocationState {
  email?: string;
  remainingResends?: number;
  cooldownSeconds?: number;
}

export const ResetPasswordForm = () => {
  const [form] = Form.useForm<PasswordFormValues>();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const email = state?.email;
  const resetMutation = useResetPassword();
  const resendMutation = useResendOtp();
  const { t } = useTranslation('auth');

  const [step, setStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState('');

  const handleOtpSubmit = useCallback((code: string) => {
    setOtpCode(code);
    setStep(2);
  }, []);

  const handleResendOtp = useCallback(async (): Promise<OtpSendResponse> => {
    if (!email) throw new Error('Email is missing');
    const response = await resendMutation.mutateAsync({
      email,
      type: 'ForgotPassword',
    });
    return response.data;
  }, [email, resendMutation]);

  const handlePasswordSubmit = useCallback(
    (values: PasswordFormValues) => {
      if (!email) return;
      resetMutation.mutate(
        { email, otpCode, newPassword: values.newPassword },
        {
          onError: () => {
            // On OTP-related error, go back to step 1
            setStep(1);
            setOtpCode('');
          },
        },
      );
    },
    [email, otpCode, resetMutation],
  );

  const handleBackToStep1 = useCallback(() => {
    setStep(1);
  }, []);

  if (!email) {
    return <Navigate to="/forgot-password" replace />;
  }

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>{t('resetPassword.title')}</Title>
        {step === 2 && <Text type="secondary">{t('resetPassword.newPasswordSubtitle')}</Text>}
      </div>

      {step === 1 && (
        <>
          <OtpVerificationStep
            email={email}
            onSubmitOtp={handleOtpSubmit}
            onResendOtp={handleResendOtp}
            isSubmitting={false}
            isResending={resendMutation.isPending}
            initialRemainingResends={state?.remainingResends}
            initialCooldownSeconds={state?.cooldownSeconds}
          />

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link to="/forgot-password">
              <ArrowLeftOutlined /> {t('resetPassword.backToForgot')}
            </Link>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <Form form={form} layout="vertical" onFinish={handlePasswordSubmit} autoComplete="off">
            <Form.Item
              name="newPassword"
              rules={[
                { required: true, message: t('validation.passwordRequired') },
                { min: 8, message: t('validation.passwordMin') },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('resetPassword.newPasswordPlaceholder')}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: t('validation.confirmPasswordRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('validation.confirmPasswordMismatch')));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={resetMutation.isPending}
              >
                {t('resetPassword.submitButton')}
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Button type="link" onClick={handleBackToStep1} icon={<ArrowLeftOutlined />}>
              {t('resetPassword.backToOtp')}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};
