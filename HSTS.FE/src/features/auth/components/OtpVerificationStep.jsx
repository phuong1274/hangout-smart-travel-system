import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Typography, Space, Flex } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

const OTP_EXPIRY_SECONDS = 300;
const DEFAULT_COOLDOWN_SECONDS = 60;
const DEFAULT_MAX_RESENDS = 3;

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const OtpVerificationStep = ({
  email,
  onSubmitOtp,
  onResendOtp,
  isSubmitting,
  isResending,
  initialCooldownSeconds = DEFAULT_COOLDOWN_SECONDS,
  initialRemainingResends = DEFAULT_MAX_RESENDS,
}) => {
  const [otpValue, setOtpValue] = useState('');
  const [expiryCountdown, setExpiryCountdown] = useState(OTP_EXPIRY_SECONDS);
  const [cooldown, setCooldown] = useState(initialCooldownSeconds);
  const [remainingResends, setRemainingResends] = useState(initialRemainingResends);

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
    if (cooldown > 0 || remainingResends <= 0) return;
    const result = await onResendOtp();
    if (result) {
      setCooldown(result.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS);
      setRemainingResends(result.remainingResends ?? 0);
      setExpiryCountdown(OTP_EXPIRY_SECONDS);
    }
  }, [cooldown, remainingResends, onResendOtp]);

  const isExpired = expiryCountdown === 0;
  const canResend = cooldown === 0 && remainingResends > 0 && !isResending;

  return (
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

      <Flex justify="space-between" align="center">
        <Button
          type="primary"
          onClick={() => onSubmitOtp(otpValue)}
          disabled={otpValue.length !== 6 || isExpired}
          loading={isSubmitting}
        >
          Verify
        </Button>

        <Button
          icon={<ReloadOutlined />}
          onClick={handleResend}
          disabled={!canResend}
          loading={isResending}
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
  );
};

export default OtpVerificationStep;
