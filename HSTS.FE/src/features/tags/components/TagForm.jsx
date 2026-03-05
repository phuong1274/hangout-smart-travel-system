import React, { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import { createTagApi, updateTagApi } from '../api';

const TagForm = ({ open, tag, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const isEdit = !!tag;

  useEffect(() => {
    if (tag) {
      form.setFieldsValue({
        name: tag.name,
      });
    } else {
      form.resetFields();
    }
  }, [tag, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        await updateTagApi(tag.id, values);
      } else {
        await createTagApi(values);
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
      title={isEdit ? 'Edit Tag' : 'Create Tag'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="Tag Name"
          rules={[
            { required: true, message: 'Please enter tag name' },
            { max: 100, message: 'Tag name cannot exceed 100 characters' }
          ]}
        >
          <Input placeholder="Enter tag name" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TagForm;
