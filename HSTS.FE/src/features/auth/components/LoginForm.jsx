import { Button, Form, Input, Typography } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin, useGoogleLogin } from '../hooks/useAuth';
import { PATHS } from '@/routes/paths';

import styles from '../styles/LoginForm.module.css';

const { Title, Text } = Typography;

const LoginForm = () => {
  const [form] = Form.useForm();
  const { login, loading } = useLogin();
  const { googleLogin, loading: googleLoading } = useGoogleLogin();
  const navigate = useNavigate();

  return (
    <div className={styles.loginContainer}>
      
    
      <div className={styles.loginLeft}>
        <Title level={2} className={styles.loginTitle}>Sign in to Hangout</Title>

        <div className={styles.googleLoginWrapper}>
          <GoogleLogin
            onSuccess={(res) => googleLogin(res.credential)}
            onError={() => {}}
            useOneTap={false}
            shape="pill" 
          />
        </div>

        <Text type="secondary" className={styles.loginDividerText}>
          or use your email account:
        </Text>

        <Form 
          form={form} 
          layout="vertical" 
          onFinish={login} 
          autoComplete="off"
          className={styles.loginForm}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Invalid email address' },
            ]}
          >
            <Input 
              prefix={<MailOutlined className={styles.loginIcon} />} 
              placeholder="Email" 
              size="large" 
              className={styles.loginInput}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password 
              prefix={<LockOutlined className={styles.loginIcon} />} 
              placeholder="Password" 
              size="large" 
              className={styles.loginInput}
            />
          </Form.Item>

          <div className={styles.forgotPassword}>
            <Link to={PATHS.AUTH.FORGOT_PASSWORD}>
              Forgot your password?
            </Link>
          </div>

          <Form.Item style={{ textAlign: 'center' }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              loading={loading}
              shape="round"
              className={styles.btnSignin}
            >
              SIGN IN
            </Button>
          </Form.Item>
        </Form>
      </div>

      
      <div className={styles.loginRight}>
        <Title level={2} className={styles.welcomeTitle}>Hello, Friend!</Title>
        <Text className={styles.welcomeText}>
          Enter your personal details and start<br />journey with us
        </Text>
        
        <Button 
          size="large" 
          shape="round" 
          onClick={() => navigate(PATHS.AUTH.REGISTER)}
          className={styles.btnSignup}
        >
          SIGN UP
        </Button>
      </div>

    </div>
  );
};

export default LoginForm;