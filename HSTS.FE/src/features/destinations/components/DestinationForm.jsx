import React, { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import { createDestinationApi, updateDestinationApi } from '../api';

const { TextArea } = Input;

const DestinationForm = ({ open, destination, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const isEdit = !!destination;

  useEffect(() => {
    if (destination) {
      form.setFieldsValue({
        name: destination.name,
      });
    } else {
      form.resetFields();
    }
  }, [destination, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        await updateDestinationApi(destination.id, values);
      } else {
        await createDestinationApi(values);
      }
      onSuccess();
      onClose();
    } catch (error) {
      // Handled by global interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Destination' : 'Create Destination'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="Destination Name"
          rules={[
            { required: true, message: 'Please enter destination name' },
            { max: 200, message: 'Destination name cannot exceed 200 characters' }
          ]}
        >
          <Input placeholder="Enter destination name" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DestinationForm;
