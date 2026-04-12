import React, { useState } from 'react';
import { Modal, Select, message, Typography } from 'antd';

const { Text } = Typography;

const ROLES = [
  { value: 'Leader', label: 'Leader' },
  { value: 'Treasurer', label: 'Treasurer' },
  { value: 'Member', label: 'Member' },
];

const ChangeRoleModal = ({ open, onCancel, member, hasTreasurer, onSubmit }) => {
  const [selectedRole, setSelectedRole] = useState(member?.role || 'Member');
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    if (selectedRole === member?.role) {
      onCancel?.();
      return;
    }
    setLoading(true);
    try {
      await onSubmit(member.userId, selectedRole);
      onCancel?.();
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Change Role for ${member?.fullName || 'Member'}`}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Update Role"
    >
      <div style={{ marginBottom: 16 }}>
        <Text>Select a new role:</Text>
      </div>
      <Select
        value={selectedRole}
        onChange={setSelectedRole}
        style={{ width: '100%' }}
        size="large"
        options={ROLES.map((r) => ({
          ...r,
          disabled: r.value === 'Treasurer' && hasTreasurer && member?.role !== 'Treasurer',
        }))}
      />
      {selectedRole === 'Leader' && (
        <div style={{ marginTop: 12, padding: 8, background: '#fff7e6', borderRadius: 6 }}>
          <Text type="warning">
            Transferring leadership will demote you to Member. This action is irreversible without the new leader's action.
          </Text>
        </div>
      )}
    </Modal>
  );
};

export default ChangeRoleModal;
