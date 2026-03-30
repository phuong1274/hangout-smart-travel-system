import { Button, Form, Input, Typography } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useRegister, useGoogleLogin } from '../hooks/useAuth';
import { PATHS } from '@/routes/paths';

// Import CSS Modules
import styles from './RegisterForm.module.css';

const { Title, Text } = Typography;

const RegisterForm = () => {
  const [form] = Form.useForm();
  const { register, loading } = useRegister();
  const { googleLogin } = useGoogleLogin();
  const navigate = useNavigate();

  const onFinish = (values) => {
    const data = { ...values };
    delete data.confirmPassword;
    register(data);
  };

  return (
    <div className={styles.registerContainer}>

      
      <div className={styles.registerLeft}>
        <Title level={2} className={styles.welcomeTitle}>Welcome Back!</Title>
        <Text className={styles.welcomeText}>
          To keep connected with us please login with your personal info
        </Text>

        <Button
          size="large"
          shape="round"
          onClick={() => navigate(PATHS.AUTH.LOGIN)}
          className={styles.btnSignin}
        >
          SIGN IN
        </Button>
      </div>

      
      <div className={styles.registerRight}>
        <Title level={2} className={styles.registerTitle}>Create Account</Title>

        <div className={styles.googleLoginWrapper}>
          <GoogleLogin
            onSuccess={(res) => googleLogin(res.credential)}
            onError={() => { }}
            useOneTap={false}
            shape="pill"
          />
        </div>

        <Text type="secondary" className={styles.registerDividerText}>
          or use your email for registration:
        </Text>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
          className={styles.registerForm}
        >
          <Form.Item
            name="fullName"
            rules={[
              { required: true, message: 'Please enter your full name' },
              { max: 100, message: 'Full name must be at most 100 characters' },
            ]}
          >
            <Input
              prefix={<UserOutlined className={styles.registerIcon} />}
              placeholder="Name"
              size="large"
              className={styles.registerInput}
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Invalid email address' },
            ]}
          >
            <Input
              prefix={<MailOutlined className={styles.registerIcon} />}
              placeholder="Email"
              size="large"
              className={styles.registerInput}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className={styles.registerIcon} />}
              placeholder="Password"
              size="large"
              className={styles.registerInput}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className={styles.registerIcon} />}
              placeholder="Confirm Password"
              size="large"
              className={styles.registerInput}
            />
          </Form.Item>

          <Form.Item style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              shape="round"
              className={styles.btnSignup}
            >
              SIGN UP
            </Button>
          </Form.Item>
        </Form>
      </div>

    </div>
  );
};

export default RegisterForm;
