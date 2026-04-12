import React, { useState } from 'react';
import { Modal, Input, message, Typography } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { createInvitationApi } from '../api';

const { Text } = Typography;

const InviteMemberModal = ({ open, onCancel, tripId, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      message.warning('Please enter an email address.');
      return;
    }

    setLoading(true);
    try {
      await createInvitationApi(tripId, trimmed);
      message.success(`Invitation sent to ${trimmed}!`);
      setEmail('');
      onSuccess?.();
      onCancel?.();
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data?.title || err?.response?.data || '';
      message.error(typeof errMsg === 'string' && errMsg ? errMsg : 'Failed to send invitation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Invite Member"
      open={open}
      onCancel={() => { setEmail(''); onCancel?.(); }}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Send Invitation"
    >
      <div style={{ marginBottom: 16 }}>
        <Text>Enter the email address of the user you want to invite:</Text>
      </div>
      <Input
        prefix={<MailOutlined />}
        placeholder="e.g., user@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        size="large"
        type="email"
        onPressEnter={handleSubmit}
      />
    </Modal>
  );
};

export default InviteMemberModal;
