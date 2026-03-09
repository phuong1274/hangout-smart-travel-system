import { useEffect } from 'react';
import { Form, Input, Modal } from 'antd';
import { useCreateProfile, useUpdateProfile } from '../hooks/useUserProfile';

const ProfileFormModal = ({ open, onClose, onSuccess, profile }) => {
  const [form] = Form.useForm();
  const isEdit = !!profile;
  const { createProfile, loading: creating } = useCreateProfile(onSuccess);
  const { updateProfile, loading: updating } = useUpdateProfile(onSuccess);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(profile ?? { profileName: '', address: '', avatarUrl: '' });
    }
  }, [open, profile, form]);

  const onFinish = (values) => {
    if (isEdit) {
      updateProfile({ profileId: profile.id, ...values });
    } else {
      createProfile(values);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Profile' : 'Create Profile'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={creating || updating}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="profileName"
          label="Profile Name"
          rules={[{ required: true, message: 'Profile name is required' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="address" label="Address">
          <Input />
        </Form.Item>
        <Form.Item name="avatarUrl" label="Avatar URL">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProfileFormModal;
