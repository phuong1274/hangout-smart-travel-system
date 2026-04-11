import { useState, useCallback } from 'react';
import { Button, Form, Input, Typography } from 'antd';
import { LeftOutlined, LockOutlined } from '@ant-design/icons';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useResetPassword, useResendOtp, useVerifyForgotPasswordOtp } from '../hooks/useAuth';
import OtpVerificationStep from './OtpVerificationStep';
import { PATHS } from '@/routes/paths';
import styles from '../styles/ResetPasswordForm.module.css';

const { Title } = Typography;

const ResetPasswordForm = () => {
  const [form] = Form.useForm();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const onboardingMode = searchParams.get('mode') === 'onboarding';
  const onboardingToken = searchParams.get('token');
  const onboardingEmail = searchParams.get('email');
  const email = onboardingMode ? onboardingEmail : location.state?.email;
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
        onboardingMode
          ? { token: onboardingToken, newPassword: values.newPassword }
          : { email, otpCode, newPassword: values.newPassword },
        {
          mode: onboardingMode ? 'onboarding' : undefined,
          onError: () => {
            if (!onboardingMode) {
              setStep(1);
              setOtpCode('');
            }
          },
        },
      );
    },
    [email, otpCode, resetPassword],
  );

  if (!email || (onboardingMode && !onboardingToken)) return <Navigate to={PATHS.AUTH.FORGOT_PASSWORD} replace />;

  return (
    <>
      {!onboardingMode && step === 1 ? (
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
        <div className={styles.resetPageWrapper}>
          <div className={styles.resetContainer}>
            <div className={styles.resetContent}>
              
              <div className={styles.subHeading}>{onboardingMode ? 'Welcome aboard' : 'Create new key'}</div>
              <Title level={2} className={styles.resetTitle}>{onboardingMode ? 'Set Password' : 'Reset Password'}</Title>

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
                    prefix={<LockOutlined className={styles.resetIcon} />}
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
                    prefix={<LockOutlined className={styles.resetIcon} />}
                    placeholder="Confirm New Password"
                    size="large"
                    className={styles.resetInput}
                  />
                </Form.Item>

                <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={resetLoading}
                    className={styles.btnReset}
                  >
                    RESET PASSWORD
                  </Button>
                </Form.Item>
              </Form>

              <div className={styles.backLinkWrapper}>
                <Link to={PATHS.AUTH.LOGIN} className={styles.backLink}>
                  <LeftOutlined className={styles.backIcon} /> BACK TO LOGIN
                </Link>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ResetPasswordForm;