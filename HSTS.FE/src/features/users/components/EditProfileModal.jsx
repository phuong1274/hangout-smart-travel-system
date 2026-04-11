import { useEffect } from 'react';
import { DatePicker, Form, Input, Select, Typography, Modal } from 'antd';
import dayjs from 'dayjs';
import { useUpdateMyInfo } from '../hooks/useUserProfile';
import styles from '../styles/EditProfileModal.module.css';

const { Title } = Typography;
const { TextArea } = Input;

const GENDER_OPTIONS = [
  { value: 0, label: 'Male' },
  { value: 1, label: 'Female' },
  { value: 2, label: 'Other' },
];

const EditProfileModal = ({ open, onClose, user, refetch }) => {
  const [form] = Form.useForm();
  const { updateMyInfo, loading: saving } = useUpdateMyInfo(refetch);

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        fullName: user.fullName,
        bio: user.bio ?? '',
        dateOfBirth: user.dateOfBirth ? dayjs(user.dateOfBirth) : null,
        gender: user.gender,
        phoneNumber: user.phoneNumber,
      });
    }
  }, [open, user, form]);

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const onFinish = (values) => {
    updateMyInfo({
      fullName: values.fullName,
      bio: values.bio || null,
      dateOfBirth: values.dateOfBirth?.toISOString() ?? null,
      gender: values.gender ?? null,
      phoneNumber: values.phoneNumber || null,
    });
    onClose();
  };

  return (
    <Modal
      title={<Title level={3} className={styles.heading}>Edit Profile</Title>}
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={saving}
      destroyOnClose
      centered
      wrapClassName={styles.modalWrapper}
      okText="Save Changes"
      cancelText="Cancel"
      okButtonProps={{ size: 'large' }}
      cancelButtonProps={{ size: 'large' }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
        <Form.Item label="Email">
          <Input value={user?.email} disabled size="large" />
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
        <Form.Item
          name="bio"
          label="Bio"
          rules={[{ max: 300, message: 'Max 300 characters' }]}
        >
          <TextArea rows={4} maxLength={300} showCount placeholder="Tell us about yourself..." size="large" />
        </Form.Item>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Form.Item name="dateOfBirth" label="Date of Birth" style={{ flex: '1 1 200px' }}>
            <DatePicker style={{ width: '100%' }} size="large" />
          </Form.Item>
          <Form.Item name="gender" label="Gender" style={{ flex: '1 1 200px' }}>
            <Select options={GENDER_OPTIONS} allowClear size="large" />
          </Form.Item>
        </div>
        <Form.Item name="phoneNumber" label="Phone Number">
          <Input size="large" maxLength={15} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditProfileModal;