import { Button, Card, Form, Input, Typography } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useVerifyEmail, useResendOtp } from '../api/auth.query';

const { Title, Text } = Typography;

export const VerifyEmailForm = () => {
  const [form] = Form.useForm();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email;
  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendOtp();
  const { t } = useTranslation('auth');

  if (!email) {
    return <Navigate to="/register" replace />;
  }

  const handleVerify = (values: { otpCode: string }) => {
    verifyMutation.mutate({ email, otpCode: values.otpCode });
  };

  const handleResend = () => {
    resendMutation.mutate({ email });
  };

  return (
    <Card>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>{t('verifyEmail.title')}</Title>
        <Text type="secondary">{t('verifyEmail.subtitle', { email })}</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleVerify} autoComplete="off">
        <Form.Item
          name="otpCode"
          rules={[
            { required: true, message: t('validation.otpRequired') },
            { len: 6, message: t('validation.otpLength') },
          ]}
        >
          <Input
            prefix={<SafetyOutlined />}
            placeholder={t('verifyEmail.otpPlaceholder')}
            size="large"
            maxLength={6}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={verifyMutation.isPending}
          >
            {t('verifyEmail.submitButton')}
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center' }}>
        <Text>{t('verifyEmail.noCode')} </Text>
        <Button type="link" onClick={handleResend} loading={resendMutation.isPending}>
          {t('verifyEmail.resendLink')}
        </Button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Link to="/login">{t('verifyEmail.backToLogin')}</Link>
      </div>
    </Card>
  );
};
