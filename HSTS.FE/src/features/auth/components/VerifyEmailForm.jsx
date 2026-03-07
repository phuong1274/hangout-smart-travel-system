import { useCallback } from 'react';
import { Card, Typography } from 'antd';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useVerifyEmail, useResendOtp } from '../hooks/useAuth';
import OtpVerificationStep from './OtpVerificationStep';
import { PATHS } from '@/routes/paths';

const { Title } = Typography;

const VerifyEmailForm = () => {
  const location = useLocation();
  const email = location.state?.email;
  const { verifyEmail, loading: verifyLoading } = useVerifyEmail();
  const { resendOtp, loading: resendLoading } = useResendOtp();

  const handleSubmitOtp = useCallback(
    (otpCode) => { if (email) verifyEmail({ email, otpCode }); },
    [email, verifyEmail],
  );

  const handleResendOtp = useCallback(async () => {
    if (!email) return;
    return resendOtp({ email, type: 'EmailVerification' });
  }, [email, resendOtp]);

  if (!email) return <Navigate to={PATHS.AUTH.REGISTER} replace />;

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>Verify Your Email</Title>
      </div>

      <OtpVerificationStep
        email={email}
        onSubmitOtp={handleSubmitOtp}
        onResendOtp={handleResendOtp}
        isSubmitting={verifyLoading}
        isResending={resendLoading}
      />

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to={PATHS.AUTH.LOGIN}>Back to Login</Link>
      </div>
    </Card>
  );
};

export default VerifyEmailForm;
