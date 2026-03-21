import { useState, useCallback } from 'react';
import { Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useResetPassword, useResendOtp, useVerifyForgotPasswordOtp } from '../hooks/useAuth';
import OtpVerificationStep from './OtpVerificationStep';
import { PATHS } from '@/routes/paths';
import styles from '../styles/ResetPasswordForm.module.css';

const { Title } = Typography;

const ResetPasswordForm = () => {
  const [form] = Form.useForm();
  const location = useLocation();
  const email = location.state?.email;
  const initialRemainingResends = location.state?.remainingResends;
  const initialCooldownSeconds = location.state?.cooldownSeconds;

  const { resetPassword, loading: resetLoading } = useResetPassword();
  const { resendOtp, loading: resendLoading } = useResendOtp();
  const { verifyForgotPasswordOtp, loading: verifyLoading } = useVerifyForgotPasswordOtp();

  const [step, setStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');

  const handleOtpSubmit = useCallback(async (code) => {
    if (!email) return;
    const success = await verifyForgotPasswordOtp({ email, otpCode: code });
    if (success) {
      setOtpCode(code);
      setStep(2);
    }
  }, [email, verifyForgotPasswordOtp]);

  const handleResendOtp = useCallback(async () => {
    if (!email) return;
    return resendOtp({ email, type: 'ForgotPassword' });
  }, [email, resendOtp]);

  const handlePasswordSubmit = useCallback(
    (values) => {
      if (!email) return;
      resetPassword(
        { email, otpCode, newPassword: values.newPassword },
        { onError: () => { setStep(1); setOtpCode(''); } },
      );
    },
    [email, otpCode, resetPassword],
  );

  if (!email) return <Navigate to={PATHS.AUTH.FORGOT_PASSWORD} replace />;

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>Reset Password</Title>
      </div>

      {step === 1 ? (
        <OtpVerificationStep
          email={email}
          onSubmitOtp={handleOtpSubmit}
          onResendOtp={handleResendOtp}
          isSubmitting={verifyLoading}
          isResending={resendLoading}
          initialCooldownSeconds={initialCooldownSeconds}
          initialRemainingResends={initialRemainingResends}
        />
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handlePasswordSubmit}
          autoComplete="off"
          className={styles.resetForm}
        >
          <Form.Item
            name="newPassword"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password
              placeholder="New Password"
              size="large"
              className={styles.resetInput}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="Confirm New Password"
              size="large"
              className={styles.resetInput}
            />
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Button
              htmlType="submit"
              size="large"
              block
              loading={resetLoading}
              shape="round"
              className={styles.btnReset}
            >
              Reset Password
            </Button>
          </Form.Item>
        </Form>
      )}

      <div>
        <Link to={PATHS.AUTH.LOGIN} className={styles.backLink}>
          <LeftOutlined /> Back to Login
        </Link>
      </div>
    </Card>
  );
};

export default ResetPasswordForm;