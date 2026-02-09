import { Button, Card, Divider, Form, Input, Typography } from 'antd';
import { GoogleOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLogin } from '../api/auth.query';
import type { LoginRequest } from '../types/auth.type';

const { Title, Text } = Typography;

export const LoginForm = () => {
  const [form] = Form.useForm<LoginRequest>();
  const loginMutation = useLogin();
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation();

  const onFinish = (values: LoginRequest) => {
    loginMutation.mutate(values);
  };

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>{t('signIn.title')}</Title>
        <Text type="secondary">{t('signIn.subtitle', { appName: tCommon('appName') })}</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
        <Form.Item
          name="email"
          rules={[
            { required: true, message: t('validation.emailRequired') },
            { type: 'email', message: t('validation.emailInvalid') },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder={t('signIn.emailPlaceholder')} size="large" />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: t('validation.passwordRequired') }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={t('signIn.passwordPlaceholder')}
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loginMutation.isPending}
          >
            {t('signIn.submitButton')}
          </Button>
        </Form.Item>
      </Form>

      <Divider>{tCommon('divider.or')}</Divider>

      <Button icon={<GoogleOutlined />} size="large" block style={{ marginBottom: 16 }}>
        {t('signIn.googleButton')}
      </Button>

      <div style={{ textAlign: 'center' }}>
        <Text>
          {t('signIn.noAccount')} <Link to="/register">{t('signIn.signUpLink')}</Link>
        </Text>
      </div>
    </Card>
  );
};
