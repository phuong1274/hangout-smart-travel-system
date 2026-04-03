import React from 'react';
import { Modal, Typography } from 'antd';

const { Text } = Typography;

const AccommodationModal = ({ visible, onOk, onCancel }) => {
  return (
    <Modal
      title="Accommodation Modal"
      visible={visible}
      onOk={onOk}
      onCancel={onCancel}
      footer={null}
    >
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <Text style={{ fontSize: 16, color: '#888' }}>
          No content available
        </Text>
      </div>
    </Modal>
  );
};

export default AccommodationModal;