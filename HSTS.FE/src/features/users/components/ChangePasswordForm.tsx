import { Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useChangePassword } from '@/features/auth';

const { Title } = Typography;

interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ChangePasswordForm = () => {
  const [form] = Form.useForm<ChangePasswordValues>();
  const changeMutation = useChangePassword();
  const { t } = useTranslation('profile');
  const { t: tAuth } = useTranslation('auth');

  const onFinish = (values: ChangePasswordValues) => {
    changeMutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => form.resetFields() },
    );
  };

  return (
    <Card>
      <Title level={4}>{t('changePassword')}</Title>

      <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
        <Form.Item
          name="currentPassword"
          label={t('password.current')}
          rules={[{ required: true, message: tAuth('validation.passwordRequired') }]}
        >
          <Input.Password prefix={<LockOutlined />} size="large" />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label={t('password.new')}
          rules={[
            { required: true, message: tAuth('validation.passwordRequired') },
            { min: 8, message: tAuth('validation.passwordMin') },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} size="large" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label={t('password.confirm')}
          dependencies={['newPassword']}
          rules={[
            { required: true, message: tAuth('validation.confirmPasswordRequired') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(tAuth('validation.confirmPasswordMismatch')));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} size="large" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={changeMutation.isPending}>
            {t('changePassword')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
