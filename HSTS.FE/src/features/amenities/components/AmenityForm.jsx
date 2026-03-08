import React, { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import { createAmenityApi, updateAmenityApi } from '../api';

const { TextArea } = Input;

const AmenityForm = ({ open, amenity, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const isEdit = !!amenity;

  useEffect(() => {
    if (amenity) {
      form.setFieldsValue({
        name: amenity.name,
        description: amenity.description
      });
    } else {
      form.resetFields();
    }
  }, [amenity, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        await updateAmenityApi(amenity.id, values);
      } else {
        await createAmenityApi(values);
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
      title={isEdit ? 'Edit Amenity' : 'Create Amenity'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="Amenity Name"
          rules={[
            { required: true, message: 'Please enter amenity name' },
            { max: 200, message: 'Amenity name cannot exceed 200 characters' }
          ]}
        >
          <Input placeholder="e.g., Free WiFi, Swimming Pool" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ max: 500, message: 'Description cannot exceed 500 characters' }]}
        >
          <TextArea rows={3} placeholder="Enter description (optional)" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AmenityForm;
