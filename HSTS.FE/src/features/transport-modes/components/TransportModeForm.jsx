import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select } from 'antd';
import { createTransportModeApi, updateTransportModeApi } from '../api';

const CATEGORY_OPTIONS = [
  { value: 1, label: 'Dynamic Local' },
  { value: 2, label: 'Fixed Intercity' },
];

const TransportModeForm = ({ open, transportMode, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const isEdit = !!transportMode;

  useEffect(() => {
    if (transportMode) {
      form.setFieldsValue({
        name: transportMode.name,
        category: transportMode.category,
        capacity: transportMode.capacity,
      });
    } else {
      form.resetFields();
    }
  }, [transportMode, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        await updateTransportModeApi(transportMode.id, values);
      } else {
        await createTransportModeApi(values);
      }
      onSuccess();
      onClose();
    } catch {
      // Handled by global interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Transport Mode' : 'Create Transport Mode'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      okText={isEdit ? 'Update' : 'Create'}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Please enter name' }]}
        >
          <Input placeholder="e.g., Motorbike, Bus, Train" />
        </Form.Item>

        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true, message: 'Please select category' }]}
        >
          <Select options={CATEGORY_OPTIONS} placeholder="Select category" />
        </Form.Item>

        <Form.Item
          name="capacity"
          label="Capacity"
          rules={[{ required: true, message: 'Please enter capacity' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g., 4" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TransportModeForm;
