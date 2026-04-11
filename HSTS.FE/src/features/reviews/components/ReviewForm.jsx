import React, { useEffect } from 'react';
import { Form, Input, Rate, Checkbox, Button, Space } from 'antd';
import styles from '../styles/ReviewForm.module.css';

export const ReviewForm = ({ initialValues, onSubmit, onCancel, submitting }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(initialValues || { rating: 5, comment: '', isAnonymous: false });
  }, [initialValues, form]);

  const handleFinish = (values) => {
    onSubmit({
      rating: values.rating,
      comment: values.comment?.trim(),
      isAnonymous: !!values.isAnonymous,
    });
  };

  return (
    <Form className={styles.form} form={form} layout="vertical" onFinish={handleFinish}>
      <Form.Item name="rating" label="Rating" rules={[{ required: true, message: 'Rating is required.' }]}>
        <Rate />
      </Form.Item>
      <Form.Item
        name="comment"
        label="Your review"
        rules={[
          { required: true, message: 'Please share your experience.' },
          { max: 2000, message: 'Comment is too long.' },
        ]}
      >
        <Input.TextArea rows={4} maxLength={2000} showCount />
      </Form.Item>
      <Form.Item name="isAnonymous" valuePropName="checked">
        <Checkbox>Post as anonymous</Checkbox>
      </Form.Item>
      <Space>
        <Button type="primary" htmlType="submit" loading={submitting}>Submit</Button>
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
      </Space>
    </Form>
  );
};
