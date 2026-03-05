import { Button, Card, DatePicker, Form, Input, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMyInfo, useUpdateMyInfo } from '../api/users.query';
import { LoadingScreen } from '@/components/common';
import dayjs from 'dayjs';
import type { UpdateMyInfoRequest } from '../types/users.type';

const { Title } = Typography;

const GENDER_OPTIONS = [
  { value: 0, label: 'Male' },
  { value: 1, label: 'Female' },
  { value: 2, label: 'Other' },
];

export const UserInfoCard = () => {
  const [form] = Form.useForm();
  const { data: user, isLoading } = useMyInfo();
  const updateMutation = useUpdateMyInfo();
  const { t } = useTranslation('profile');

  if (isLoading) return <LoadingScreen />;
  if (!user) return null;

  const initialValues = {
    fullName: user.fullName,
    dateOfBirth: user.dateOfBirth ? dayjs(user.dateOfBirth) : null,
    gender: user.gender,
    phoneNumber: user.phoneNumber,
  };

  const onFinish = (values: {
    fullName: string;
    dateOfBirth: dayjs.Dayjs | null;
    gender: number | null;
    phoneNumber: string | null;
  }) => {
    const data: UpdateMyInfoRequest = {
      fullName: values.fullName,
      dateOfBirth: values.dateOfBirth?.toISOString() ?? null,
      gender: values.gender,
      phoneNumber: values.phoneNumber || null,
    };
    updateMutation.mutate(data);
  };

  return (
    <Card>
      <Title level={4}>{t('editProfile')}</Title>

      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onFinish}>
        <Form.Item label={t('fields.email')}>
          <Input value={user.email} disabled size="large" />
        </Form.Item>

        <Form.Item
          name="fullName"
          label={t('fields.fullName')}
          rules={[
            { required: true, message: t('validation.fullNameRequired') },
            { max: 100, message: t('validation.fullNameMax') },
          ]}
        >
          <Input size="large" />
        </Form.Item>

        <Form.Item name="dateOfBirth" label={t('fields.dateOfBirth')}>
          <DatePicker style={{ width: '100%' }} size="large" />
        </Form.Item>

        <Form.Item name="gender" label={t('fields.gender')}>
          <Select options={GENDER_OPTIONS} allowClear size="large" />
        </Form.Item>

        <Form.Item name="phoneNumber" label={t('fields.phone')}>
          <Input size="large" maxLength={15} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
            {t('saveChanges')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
