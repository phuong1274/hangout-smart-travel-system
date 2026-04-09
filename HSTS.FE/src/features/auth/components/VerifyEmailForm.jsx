import { useCallback } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { LeftOutlined } from '@ant-design/icons';
import { useVerifyEmail, useResendOtp } from '../hooks/useAuth';
import OtpVerificationStep from './OtpVerificationStep';
import { PATHS } from '@/routes/paths';
import styles from '../styles/VerifyEmailForm.module.css';

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
    <div className={styles.verifyPageWrapper}>
      <OtpVerificationStep
        email={email}
        onSubmitOtp={handleSubmitOtp}
        onResendOtp={handleResendOtp}
        isSubmitting={verifyLoading}
        isResending={resendLoading}
      />
      
      <div className={styles.floatingBackLink}>
        <Link to={PATHS.AUTH.LOGIN} className={styles.backLink}>
          <LeftOutlined className={styles.backIcon} /> BACK TO LOGIN
        </Link>
      </div>
    </div>
  );
};

export default VerifyEmailForm;