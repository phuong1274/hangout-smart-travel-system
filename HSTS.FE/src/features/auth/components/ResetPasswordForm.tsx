import { Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useResetPassword } from '../api/auth.query';

const { Title, Text } = Typography;

interface ResetFormValues {
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
}

export const ResetPasswordForm = () => {
  const [form] = Form.useForm<ResetFormValues>();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email;
  const resetMutation = useResetPassword();
  const { t } = useTranslation('auth');

  if (!email) {
    return <Navigate to="/forgot-password" replace />;
  }

  const onFinish = (values: ResetFormValues) => {
    resetMutation.mutate({
      email,
      otpCode: values.otpCode,
      newPassword: values.newPassword,
    });
  };

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>{t('resetPassword.title')}</Title>
        <Text type="secondary">{t('resetPassword.subtitle', { email })}</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
        <Form.Item
          name="otpCode"
          rules={[
            { required: true, message: t('validation.otpRequired') },
            { len: 6, message: t('validation.otpLength') },
          ]}
        >
          <Input
            prefix={<SafetyOutlined />}
            placeholder={t('resetPassword.otpPlaceholder')}
            size="large"
            maxLength={6}
          />
        </Form.Item>

        <Form.Item
          name="newPassword"
          rules={[
            { required: true, message: t('validation.passwordRequired') },
            { min: 8, message: t('validation.passwordMin') },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={t('resetPassword.newPasswordPlaceholder')}
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: t('validation.confirmPasswordRequired') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t('validation.confirmPasswordMismatch')));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={t('resetPassword.confirmPasswordPlaceholder')}
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={resetMutation.isPending}
          >
            {t('resetPassword.submitButton')}
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center' }}>
        <Link to="/login">{t('resetPassword.backToLogin')}</Link>
      </div>
    </Card>
  );
};
