import { Button, Form, Input, Typography } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../hooks/useAuth';
import { PATHS } from '@/routes/paths';
import styles from './ForgotPasswordForm.module.css';
import forgotPasswordImg from '../assets/forgot_password_illustration.svg';

const { Title, Text } = Typography;

const ForgotPasswordForm = () => {
  const [form] = Form.useForm();
  const { forgotPassword, loading } = useForgotPassword();

  return (
    <div className={styles.forgotContainer}>
      <div className={styles.forgotLeft}>
        <img src={forgotPasswordImg} alt="Forgot Password Illustration" className={styles.forgotImage} />
      </div>

      <div className={styles.forgotRight}>
        <Title level={2} className={styles.forgotTitle}>Forgot password?</Title>
        <div className={styles.forgotDesc}>
          Enter your email address below and we'll send you a link to get back on track with your journey.
        </div>

        <Form form={form} layout="vertical" onFinish={forgotPassword} autoComplete="off" className={styles.forgotForm}>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Invalid email address' },
            ]}
          >
            <Input placeholder="Email" size="large" className={styles.forgotInput} />
          </Form.Item>

          <Form.Item style={{ textAlign: 'center' }}>
            <Button 
              htmlType="submit" 
              size="large" 
              loading={loading}
              shape="round"
              className={styles.btnReset}
            >
              RESET PASSWORD
            </Button>
          </Form.Item>
        </Form>

        <div className={styles.backLinkWrapper}>
          <Link to={PATHS.AUTH.LOGIN} className={styles.backLink}>
            <LeftOutlined /> Back to Sign-in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;