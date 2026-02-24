import React from 'react';
import { Card, Button, Form, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const onFinish = (values) => {
    console.log('Login attempt:', values);
    // Mock saving token and redirecting
    setAuth({ name: 'Admin' }, 'fake-jwt-token-123');
    navigate('/');
  };

  return (
    <Card title="System Login" style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <Form name="login" onFinish={onFinish} layout="vertical">
        <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Please input your email!' }]}> 
          <Input />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please input your password!' }]}> 
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block>Log in</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
export default LoginPage;
