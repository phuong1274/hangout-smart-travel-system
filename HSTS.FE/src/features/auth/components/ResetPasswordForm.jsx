import { useState, useEffect, useCallback } from 'react';
import { Button, Card, Flex, Form, Input, Space, Typography } from 'antd';
import { LockOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useResetPassword, useResendOtp } from '../hooks/useAuth';
import { PATHS } from '@/routes/paths';

const { Title, Text } = Typography;

const OTP_EXPIRY_SECONDS = 300;
const DEFAULT_COOLDOWN_SECONDS = 60;
const DEFAULT_MAX_RESENDS = 3;

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const ResetPasswordForm = () => {
  const [form] = Form.useForm();
  const location = useLocation();
  const email = location.state?.email;
  const initialRemainingResends = location.state?.remainingResends;
  const initialCooldownSeconds = location.state?.cooldownSeconds;

  const { resetPassword, loading: resetLoading } = useResetPassword();
  const { resendOtp, loading: resendLoading } = useResendOtp();

  const [otpValue, setOtpValue] = useState('');
  const [expiryCountdown, setExpiryCountdown] = useState(OTP_EXPIRY_SECONDS);
  const [cooldown, setCooldown] = useState(initialCooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS);
  const [remainingResends, setRemainingResends] = useState(initialRemainingResends ?? DEFAULT_MAX_RESENDS);

  useEffect(() => {
    if (expiryCountdown <= 0) return;
    const timer = setInterval(() => setExpiryCountdown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [expiryCountdown]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || remainingResends <= 0 || !email) return;
    const result = await resendOtp({ email, type: 'ForgotPassword' });
    if (result) {
      setCooldown(result.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS);
      setRemainingResends(result.remainingResends ?? 0);
      setExpiryCountdown(OTP_EXPIRY_SECONDS);
      setOtpValue('');
    }
  }, [cooldown, remainingResends, email, resendOtp]);

  const handleSubmit = useCallback(
    (values) => {
      if (!email) return;
      resetPassword({ email, otpCode: otpValue, newPassword: values.newPassword });
    },
    [email, otpValue, resetPassword],
  );

  const isExpired = expiryCountdown === 0;
  const canResend = cooldown === 0 && remainingResends > 0 && !resendLoading;

  if (!email) return <Navigate to={PATHS.AUTH.FORGOT_PASSWORD} replace />;

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>Reset Password</Title>
      </div>

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Text>OTP sent to <strong>{email}</strong></Text>

        {isExpired ? (
          <Text type="danger">OTP has expired. Please resend.</Text>
        ) : (
          <Text type="secondary">Expires in {formatTime(expiryCountdown)}</Text>
        )}

        <Input.OTP
          length={6}
          value={otpValue}
          onChange={setOtpValue}
          disabled={isExpired}
        />

        <Flex justify="flex-end">
          <Button
            icon={<ReloadOutlined />}
            onClick={handleResend}
            disabled={!canResend}
            loading={resendLoading}
            type="link"
          >
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : remainingResends <= 0
              ? 'No resends left'
              : 'Resend OTP'}
          </Button>
        </Flex>
      </Space>

      <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off" style={{ marginTop: 16 }}>
        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[
            { required: true, message: 'Please enter a new password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} size="large" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
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
          <Input.Password prefix={<LockOutlined />} size="large" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={resetLoading}
            disabled={otpValue.length !== 6 || isExpired}
          >
            Reset Password
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Link to={PATHS.AUTH.LOGIN}>Back to Login</Link>
      </div>
    </Card>
  );
};

export default ResetPasswordForm;