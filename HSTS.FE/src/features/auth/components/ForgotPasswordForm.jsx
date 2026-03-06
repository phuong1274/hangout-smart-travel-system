import { Button, Card, Form, Input, Typography } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../hooks/useAuth';
import { PATHS } from '@/routes/paths';

const { Title, Text } = Typography;

const ForgotPasswordForm = () => {
  const [form] = Form.useForm();
  const { forgotPassword, loading } = useForgotPassword();

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>Forgot Password</Title>
        <Text type="secondary">Enter your email to receive a reset OTP</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={forgotPassword} autoComplete="off">
        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Invalid email address' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Send OTP
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center' }}>
        <Link to={PATHS.AUTH.LOGIN}>Back to Login</Link>
      </div>
    </Card>
  );
};

export default ForgotPasswordForm;
