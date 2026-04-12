import React, { useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Typography, message } from 'antd';
import { usersApi } from '../api';
import styles from '../styles/CreateUserModal.module.css';

const { Text } = Typography;

export const CreateUserModal = ({ open, onClose, onCreated, roles = [] }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const roleOptions = useMemo(
    () => roles
      .filter((role) => role.name !== 'TRAVELER')
      .map((role) => ({ value: role.id, label: role.name })),
    [roles]
  );

  const handleClose = () => {
    form.resetFields();
    onClose?.();
  };

  const handleFinish = async (values) => {
    setSubmitting(true);
    try {
      const response = await usersApi.createUser(values);
      message.success(response.data?.message || 'Onboarding email sent.');
      form.resetFields();
      onCreated?.();
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Create user"
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Text type="secondary">
          The admin selects the initial role and sends an onboarding email link. The user opens the link and chooses the final password.
        </Text>

        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            name="fullName"
            label="Full name"
            rules={[{ required: true, message: 'Full name is required.' }]}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required.' },
              { type: 'email', message: 'Enter a valid email.' },
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Form.Item
            name="roleId"
            label="Initial role"
            rules={[{ required: true, message: 'Role is required.' }]}
          >
            <Select options={roleOptions} placeholder="Select a role" />
          </Form.Item>

          <div className={styles.btnGroup}>
            <Space>
              <Button className={styles.actionBtn} onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting} 
                className={`${styles.actionBtn} ${styles.primaryBtn}`}
              >
                Send onboarding
              </Button>
            </Space>
          </div>
        </Form>
      </Space>
    </Modal>
  );
};