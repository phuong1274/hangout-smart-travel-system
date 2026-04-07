import React from 'react';
import { Modal, Form, Select, Input } from 'antd';
import { REVIEW_REPORT_REASONS } from '../constants';

export const ReportReviewModal = ({ open, review, submitting, onCancel, onSubmit }) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit({ reviewId: review.id, reason: values.reason, description: values.description });
    form.resetFields();
  };

  return (
    <Modal
      open={open}
      title="Report this review"
      okText="Submit report"
      onOk={handleOk}
      onCancel={() => { form.resetFields(); onCancel(); }}
      confirmLoading={submitting}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
          <Select options={REVIEW_REPORT_REASONS} />
        </Form.Item>
        <Form.Item name="description" label="Details" rules={[{ max: 1000 }]}>
          <Input.TextArea rows={3} maxLength={1000} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
};
