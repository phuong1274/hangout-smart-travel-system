import React, { useState } from 'react';
import { Card, Button, Form, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { loginApi } from '../api';
import { PATHS } from '@/routes/paths';

const LoginPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await loginApi(values);
      setAuth(response.user, response.token);
      message.success('Login successful!');
      navigate(PATHS.DASHBOARD);
    } catch (error) {
      // Error is handled by axios interceptors
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="System Login" style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <Form name="login" onFinish={onFinish} layout="vertical">
        <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Please input your email!' }, { type: 'email', message: 'Please enter a valid email!' }]}> 
          <Input />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please input your password!' }]}> 
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>Log in</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
export default LoginPage;
