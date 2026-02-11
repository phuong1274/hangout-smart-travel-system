import { Button, Card, Form, Input, Typography } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForgotPassword } from '../api/auth.query';
import type { ForgotPasswordRequest } from '../types/auth.type';

const { Title, Text } = Typography;

export const ForgotPasswordForm = () => {
  const [form] = Form.useForm<ForgotPasswordRequest>();
  const forgotMutation = useForgotPassword();
  const { t } = useTranslation('auth');

  const onFinish = (values: ForgotPasswordRequest) => {
    forgotMutation.mutate(values);
  };

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>{t('forgotPassword.title')}</Title>
        <Text type="secondary">{t('forgotPassword.subtitle')}</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
        <Form.Item
          name="email"
          rules={[
            { required: true, message: t('validation.emailRequired') },
            { type: 'email', message: t('validation.emailInvalid') },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder={t('forgotPassword.emailPlaceholder')}
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={forgotMutation.isPending}
          >
            {t('forgotPassword.submitButton')}
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center' }}>
        <Link to="/login">{t('forgotPassword.backToLogin')}</Link>
      </div>
    </Card>
  );
};
