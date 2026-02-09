import { Button, Card, Divider, Form, Input, Typography } from 'antd';
import { GoogleOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useLogin } from '../api/auth.query';
import type { LoginRequest } from '../types/auth.type';
import { APP_NAME } from '@/config/constants';

const { Title, Text } = Typography;

export const LoginForm = () => {
  const [form] = Form.useForm<LoginRequest>();
  const loginMutation = useLogin();

  const onFinish = (values: LoginRequest) => {
    loginMutation.mutate(values);
  };

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>Sign In</Title>
        <Text type="secondary">Welcome to {APP_NAME}</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
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

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loginMutation.isPending}
          >
            Sign In
          </Button>
        </Form.Item>
      </Form>

      <Divider>or</Divider>

      <Button icon={<GoogleOutlined />} size="large" block style={{ marginBottom: 16 }}>
        Sign in with Google
      </Button>

      <div style={{ textAlign: 'center' }}>
        <Text>
          Don&apos;t have an account? <Link to="/register">Sign up now</Link>
        </Text>
      </div>
    </Card>
  );
};
