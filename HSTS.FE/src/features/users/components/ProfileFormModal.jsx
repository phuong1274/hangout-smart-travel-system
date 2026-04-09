import { useEffect, useRef, useState } from 'react';
import { Avatar, Form, Input, Modal, Typography } from 'antd';
import { CameraOutlined, UserOutlined } from '@ant-design/icons';
import { useCreateProfile, useUpdateProfile } from '../hooks/useUserProfile';
import styles from '../styles/ProfileFormModal.module.css';

const { Title } = Typography;

const ProfileFormModal = ({ open, onClose, onSuccess, profile }) => {
  const [form] = Form.useForm();
  const isEdit = !!profile;
  const { createProfile, loading: creating } = useCreateProfile(onSuccess);
  const { updateProfile, loading: updating } = useUpdateProfile(onSuccess);
  
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(profile ?? { profileName: '', address: '', avatarUrl: '' });
      setPreview(profile?.avatarUrl || null);
    } else {
      setPreview(null);
    }
  }, [open, profile, form]);

  const onFinish = (values) => {
    if (isEdit) {
      updateProfile({ profileId: profile.id, ...values });
    } else {
      createProfile(values);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result;
        form.setFieldsValue({ avatarUrl: base64String });
        setPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <Modal
      title={<Title level={3} className={styles.heading}>{isEdit ? 'Edit Profile' : 'Create Profile'}</Title>}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={creating || updating}
      destroyOnClose
      centered
      wrapClassName={styles.modalWrapper}
      okText="Save Profile"
      cancelText="Cancel"
      okButtonProps={{ size: 'large' }}
      cancelButtonProps={{ size: 'large' }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
        <Form.Item name="avatarUrl" style={{ display: 'none' }}>
          <Input />
        </Form.Item>

        <Form.Item label="Profile Avatar" style={{ textAlign: 'center' }}>
          <div 
            className={styles.avatarClickableWrapper}
            onClick={() => fileInputRef.current?.click()}
          >
            <Avatar 
              size={80} 
              src={preview} 
              icon={!preview && <UserOutlined />}
              style={{ 
                backgroundColor: '#4ECDC4', 
                boxShadow: '0 4px 12px rgba(78, 205, 196, 0.3)',
                fontSize: 40
              }}
            />
            <div className={styles.cameraOverlay}>
              <CameraOutlined style={{ fontSize: 16, color: '#1A535C' }} />
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </Form.Item>

        <Form.Item
          name="profileName"
          label="Profile Name"
          rules={[{ required: true, message: 'Profile name is required' }]}
        >
          <Input size="large" placeholder="e.g. Summer Vacation" />
        </Form.Item>
        
        <Form.Item name="address" label="Address">
          <Input size="large" placeholder="e.g. Bali, Indonesia" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProfileFormModal;