import React, { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import { createLocationTypeApi, updateLocationTypeApi } from '../api';

const LocationTypeForm = ({ open, locationType, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const isEdit = !!locationType;

  useEffect(() => {
    if (locationType) {
      form.setFieldsValue({
        name: locationType.name,
      });
    } else {
      form.resetFields();
    }
  }, [locationType, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        await updateLocationTypeApi(locationType.id, values);
      } else {
        await createLocationTypeApi(values);
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
      title={isEdit ? 'Edit Location Type' : 'Create Location Type'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="Location Type Name"
          rules={[
            { required: true, message: 'Please enter location type name' },
            { max: 100, message: 'Location type name cannot exceed 100 characters' }
          ]}
        >
          <Input placeholder="Enter location type name" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LocationTypeForm;
