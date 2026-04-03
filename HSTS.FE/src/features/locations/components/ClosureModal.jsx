import React, { useState } from 'react';
import { Modal, Form, DatePicker, Input, message } from 'antd';
import dayjs from 'dayjs';
import { createClosureApi } from '../api/closures';

const { TextArea } = Input;

const ClosureModal = ({ open, onClose, onSuccess, locationId, locationName }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        locationId,
        startDate: values.startDate.format('YYYY-MM-DDTHH:mm:ss'),
        endDate: values.endDate.format('YYYY-MM-DDTHH:mm:ss'),
        reason: values.reason || null,
      };

      await createClosureApi(payload);
      message.success(`"${locationName}" has been closed successfully.`);
      form.resetFields();
      onSuccess();
    } catch (error) {
      if (error.response?.data) {
        const errors = error.response.data;
        if (Array.isArray(errors)) {
          message.error(errors.map(e => e.description).join('\n'));
        } else {
          message.error('Failed to create closure. Please check your inputs.');
        }
      } else if (error.errorFields) {
        // Form validation error
        return;
      } else {
        message.error('Failed to create closure.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const disabledDate = (current) => {
    // Disable dates before today
    return current && current.isBefore(dayjs().startOf('day'));
  };

  return (
    <Modal
      title={`Close Location: ${locationName}`}
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      confirmLoading={submitting}
      okText="Close Location"
      cancelText="Cancel"
      width={500}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          startDate: dayjs(),
          endDate: dayjs().add(7, 'day'),
        }}
      >
        <Form.Item
          name="startDate"
          label="Start Date"
          rules={[{ required: true, message: 'Please select a start date' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            disabledDate={disabledDate}
            format="YYYY-MM-DD"
          />
        </Form.Item>

        <Form.Item
          name="endDate"
          label="End Date"
          rules={[
            { required: true, message: 'Please select an end date' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || !getFieldValue('startDate')) {
                  return Promise.resolve();
                }
                if (value.isBefore(getFieldValue('startDate'), 'day')) {
                  return Promise.reject(new Error('End date must be on or after start date'));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <DatePicker
            style={{ width: '100%' }}
            disabledDate={disabledDate}
            format="YYYY-MM-DD"
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Reason (optional)"
        >
          <TextArea
            rows={4}
            maxLength={500}
            showCount
            placeholder="e.g., Renovation, Maintenance, Holiday..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ClosureModal;
