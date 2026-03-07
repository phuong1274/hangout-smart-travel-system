import { Button, Card, Divider, Form, Input, Typography } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { GoogleLogin } from '@react-oauth/google';
import { Link } from 'react-router-dom';
import { useLogin, useGoogleLogin } from '../hooks/useAuth';
import { PATHS } from '@/routes/paths';

const { Title, Text } = Typography;

const LoginForm = () => {
  const [form] = Form.useForm();
  const { login, loading } = useLogin();
  const { googleLogin, loading: googleLoading } = useGoogleLogin();

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>Sign In</Title>
        <Text type="secondary">Welcome back to Hangout</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={login} autoComplete="off">
        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Invalid email address' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please enter your password' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
        </Form.Item>

        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <Link to={PATHS.AUTH.FORGOT_PASSWORD}>Forgot password?</Link>
        </div>

        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Sign In
          </Button>
        </Form.Item>
      </Form>

      <Divider plain>or</Divider>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <GoogleLogin
          onSuccess={(res) => googleLogin(res.credential)}
          onError={() => {}}
          useOneTap={false}
          width="100%"
        />
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Text>Don&apos;t have an account? <Link to={PATHS.AUTH.REGISTER}>Sign Up</Link></Text>
      </div>
    </Card>
  );
};

export default LoginForm;
