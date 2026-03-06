import { Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useRegister } from '../hooks/useAuth';
import { PATHS } from '@/routes/paths';

const { Title, Text } = Typography;

const RegisterForm = () => {
  const [form] = Form.useForm();
  const { register, loading } = useRegister();

  const onFinish = ({ confirmPassword: _, ...data }) => {
    register(data);
  };

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>Create Account</Title>
        <Text type="secondary">Join Hangout today</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
        <Form.Item
          name="fullName"
          rules={[
            { required: true, message: 'Please enter your full name' },
            { max: 100, message: 'Full name must be at most 100 characters' },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="Full Name" size="large" />
        </Form.Item>

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
          rules={[
            { required: true, message: 'Please enter a password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
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
          <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" size="large" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Sign Up
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center' }}>
        <Text>Already have an account? <Link to={PATHS.AUTH.LOGIN}>Sign In</Link></Text>
      </div>
    </Card>
  );
};

export default RegisterForm;
