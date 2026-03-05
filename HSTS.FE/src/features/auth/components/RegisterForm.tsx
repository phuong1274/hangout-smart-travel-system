import { Button, Card, Divider, Form, Input, Typography } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { GoogleLogin } from '@react-oauth/google';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRegister, useGoogleLogin } from '../api/auth.query';
import type { RegisterRequest } from '../types/auth.type';

const { Title, Text } = Typography;

interface RegisterFormValues extends RegisterRequest {
  confirmPassword: string;
}

export const RegisterForm = () => {
  const [form] = Form.useForm<RegisterFormValues>();
  const registerMutation = useRegister();
  const googleLoginMutation = useGoogleLogin();
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation();

  const onFinish = (values: RegisterFormValues) => {
    const { confirmPassword: _, ...data } = values;
    registerMutation.mutate(data);
  };

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>{t('signUp.title')}</Title>
        <Text type="secondary">{t('signUp.subtitle', { appName: tCommon('appName') })}</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
        <Form.Item
          name="fullName"
          rules={[
            { required: true, message: t('validation.fullNameRequired') },
            { max: 100, message: t('validation.fullNameMax') },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder={t('signUp.fullNamePlaceholder')}
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="email"
          rules={[
            { required: true, message: t('validation.emailRequired') },
            { type: 'email', message: t('validation.emailInvalid') },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder={t('signUp.emailPlaceholder')}
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            { required: true, message: t('validation.passwordRequired') },
            { min: 8, message: t('validation.passwordMin') },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={t('signUp.passwordPlaceholder')}
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: t('validation.confirmPasswordRequired') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t('validation.confirmPasswordMismatch')));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={t('signUp.confirmPasswordPlaceholder')}
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={registerMutation.isPending}
          >
            {t('signUp.submitButton')}
          </Button>
        </Form.Item>
      </Form>

      <Divider>{tCommon('divider.or')}</Divider>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            if (credentialResponse.credential) {
              googleLoginMutation.mutate({ googleIdToken: credentialResponse.credential });
            }
          }}
          size="large"
          width="300"
          text="signup_with"
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <Text>
          {t('signUp.hasAccount')} <Link to="/login">{t('signUp.signInLink')}</Link>
        </Text>
      </div>
    </Card>
  );
};
