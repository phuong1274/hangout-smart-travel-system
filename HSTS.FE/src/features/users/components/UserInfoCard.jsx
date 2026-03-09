import { Button, Card, DatePicker, Form, Input, Select, Spin, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMyInfo, useUpdateMyInfo } from '../hooks/useUserProfile';

const { Title } = Typography;

const GENDER_OPTIONS = [
  { value: 0, label: 'Male' },
  { value: 1, label: 'Female' },
  { value: 2, label: 'Other' },
];

const UserInfoCard = () => {
  const [form] = Form.useForm();
  const { data: user, loading, refetch } = useMyInfo();
  const { updateMyInfo, loading: saving } = useUpdateMyInfo(refetch);

  if (loading) return <Spin />;
  if (!user) return null;

  const initialValues = {
    fullName: user.fullName,
    dateOfBirth: user.dateOfBirth ? dayjs(user.dateOfBirth) : null,
    gender: user.gender,
    phoneNumber: user.phoneNumber,
  };

  const onFinish = (values) => {
    updateMyInfo({
      fullName: values.fullName,
      dateOfBirth: values.dateOfBirth?.toISOString() ?? null,
      gender: values.gender ?? null,
      phoneNumber: values.phoneNumber || null,
    });
  };

  return (
    <Card>
      <Title level={4}>Edit Profile</Title>
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onFinish}>
        <Form.Item label="Email">
          <Input value={user.email} disabled size="large" />
        </Form.Item>
        <Form.Item
          name="fullName"
          label="Full Name"
          rules={[
            { required: true, message: 'Full name is required' },
            { max: 100, message: 'Max 100 characters' },
          ]}
        >
          <Input size="large" />
        </Form.Item>
        <Form.Item name="dateOfBirth" label="Date of Birth">
          <DatePicker style={{ width: '100%' }} size="large" />
        </Form.Item>
        <Form.Item name="gender" label="Gender">
          <Select options={GENDER_OPTIONS} allowClear size="large" />
        </Form.Item>
        <Form.Item name="phoneNumber" label="Phone Number">
          <Input size="large" maxLength={15} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save Changes
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default UserInfoCard;
