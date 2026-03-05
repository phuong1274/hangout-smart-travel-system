import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Typography, Space, Flex } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { OtpSendResponse } from '../types/auth.type';

const { Text } = Typography;

const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const DEFAULT_COOLDOWN_SECONDS = 60;
const DEFAULT_MAX_RESENDS = 3;

interface OtpVerificationStepProps {
  email: string;
  onSubmitOtp: (otpCode: string) => void;
  onResendOtp: () => Promise<OtpSendResponse>;
  isSubmitting: boolean;
  isResending: boolean;
  initialCooldownSeconds?: number;
  initialRemainingResends?: number;
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const OtpVerificationStep = ({
  email,
  onSubmitOtp,
  onResendOtp,
  isSubmitting,
  isResending,
  initialCooldownSeconds = DEFAULT_COOLDOWN_SECONDS,
  initialRemainingResends = DEFAULT_MAX_RESENDS,
}: OtpVerificationStepProps) => {
  const { t } = useTranslation('auth');

  const [otpValue, setOtpValue] = useState('');
  const [expiryCountdown, setExpiryCountdown] = useState(OTP_EXPIRY_SECONDS);
  const [cooldown, setCooldown] = useState(initialCooldownSeconds);
  const [remainingResends, setRemainingResends] = useState(initialRemainingResends);

  // OTP expiry countdown
  useEffect(() => {
    if (expiryCountdown <= 0) return;
    const timer = setInterval(() => {
      setExpiryCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiryCountdown]);

  // Resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleOtpChange = useCallback((value: string) => {
    setOtpValue(value);
  }, []);

  const handleSubmit = useCallback(() => {
    if (otpValue.length === 6) {
      onSubmitOtp(otpValue);
    }
  }, [otpValue, onSubmitOtp]);

  const handleResend = useCallback(async () => {
    try {
      const result = await onResendOtp();
      setRemainingResends(result.remainingResends);
      setCooldown(result.cooldownSeconds);
      setExpiryCountdown(OTP_EXPIRY_SECONDS);
      setOtpValue('');
    } catch {
      // Error handled by the mutation hook
    }
  }, [onResendOtp]);

  const isExpired = expiryCountdown <= 0;
  const canResend = cooldown <= 0 && remainingResends > 0 && !isResending;

  return (
    <Flex vertical align="center" gap={24}>
      <Text type="secondary">{t('otp.sentTo', { email })}</Text>

      {/* OTP Expiry countdown */}
      {!isExpired ? (
        <Text type="secondary">{t('otp.expiresIn', { time: formatTime(expiryCountdown) })}</Text>
      ) : (
        <Text type="danger">{t('otp.expired')}</Text>
      )}

      {/* OTP Input */}
      <Input.OTP
        length={6}
        value={otpValue}
        onChange={handleOtpChange}
        disabled={isSubmitting}
        size="large"
      />

      {/* Submit button */}
      <Button
        type="primary"
        size="large"
        block
        onClick={handleSubmit}
        loading={isSubmitting}
        disabled={otpValue.length !== 6 || isExpired}
      >
        {t('otp.verifyButton')}
      </Button>

      {/* Resend section */}
      <Space direction="vertical" align="center" size={4}>
        <Flex align="center" gap={8}>
          <Text type="secondary">{t('otp.noCode')}</Text>
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleResend}
            loading={isResending}
            disabled={!canResend}
          >
            {cooldown > 0 ? t('otp.resendIn', { seconds: cooldown }) : t('otp.resendButton')}
          </Button>
        </Flex>
        {remainingResends > 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('otp.remainingResends', { count: remainingResends })}
          </Text>
        ) : (
          <Text type="danger" style={{ fontSize: 12 }}>
            {t('otp.noResendsLeft')}
          </Text>
        )}
      </Space>
    </Flex>
  );
};
