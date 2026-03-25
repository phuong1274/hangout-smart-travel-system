import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import styles from '../styles/OtpVerificationStep.module.css';

const { Title } = Typography;

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
      setOtpValue('');
    }
  }, [cooldown, remainingResends, onResendOtp]);

  const isExpired = expiryCountdown === 0;
  const canResend = cooldown === 0 && remainingResends > 0 && !isResending;

  return (
    <div className={styles.otpPageWrapper}>
      <div className={styles.otpContainer}>
        <div className={styles.otpContent}>
          <Title level={2} className={styles.otpTitle}>Verify OTP</Title>
          
          <div className={styles.otpDesc}>
            We have sent a verification code to<br />
            <span className={styles.emailHighlight}>{email}</span>
          </div>

          <div className={styles.expiryText}>
            {isExpired ? (
              <span className={styles.expiredAlert}>OTP has expired. Please resend.</span>
            ) : (
              <span className={styles.timerText}>Code expires in {formatTime(expiryCountdown)}</span>
            )}
          </div>

          <div className={styles.otpInputWrapper}>
            <Input.OTP
              length={6}
              value={otpValue}
              onChange={setOtpValue}
              disabled={isExpired}
              size="large"
              className={styles.otpInputBoxes}
            />
          </div>

          <Button
            type="primary"
            onClick={() => onSubmitOtp(otpValue)}
            disabled={otpValue.length !== 6 || isExpired}
            loading={isSubmitting}
            size="large"
            className={styles.btnVerify}
          >
            VERIFY
          </Button>

          <div className={styles.resendWrapper}>
            <Button
              icon={<ReloadOutlined className={styles.resendIcon} />}
              onClick={handleResend}
              disabled={!canResend}
              loading={isResending}
              type="text"
              className={styles.btnResend}
            >
              {cooldown > 0
                ? `RESEND IN ${cooldown}S`
                : remainingResends <= 0
                ? 'NO RESENDS LEFT'
                : 'RESEND OTP'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationStep;