import React, { useState } from 'react';
import { Modal, Input, message, Typography } from 'antd';
import { PhoneOutlined } from '@ant-design/icons';
import { usersApi } from '@/features/users/api';
import { useAuthStore } from '@/store/authStore';

const { Text } = Typography;

const PhoneNumberModal = ({ open, onCancel, onSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, updateUser } = useAuthStore();

  const handleSubmit = async () => {
    const trimmed = phoneNumber.trim();
    if (!trimmed || trimmed.length < 8) {
      message.warning('Please enter a valid phone number (at least 8 digits).');
      return;
    }

    setLoading(true);
    try {
      await usersApi.updateMyInfo({
        fullName: user?.fullName || user?.username || 'User',
        phoneNumber: trimmed,
      });
      updateUser({ phoneNumber: trimmed });
      message.success('Phone number updated!');
      setPhoneNumber('');
      onSuccess?.();
    } catch (err) {
      message.error('Failed to update phone number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Phone Number Required"
      open={open}
      onCancel={() => { setPhoneNumber(''); onCancel?.(); }}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Save & Continue"
    >
      <div style={{ marginBottom: 16 }}>
        <Text>A phone number is required to join a trip. Please provide your phone number to continue.</Text>
      </div>
      <Input
        prefix={<PhoneOutlined />}
        placeholder="Enter your phone number"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        maxLength={15}
        size="large"
        onPressEnter={handleSubmit}
      />
    </Modal>
  );
};

export default PhoneNumberModal;
