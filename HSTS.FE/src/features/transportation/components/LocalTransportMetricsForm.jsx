import React, { useEffect } from 'react';
import { Modal, Form, InputNumber, Select } from 'antd';
import { createLocalTransportMetricApi, updateLocalTransportMetricApi } from '../api';
import styles from '../styles/LocalTransportMetricsForm.module.css';

const LocalTransportMetricsForm = ({ open, metric, onClose, onSuccess, transportModes }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const isEdit = !!metric;

  useEffect(() => {
    if (metric) {
      form.setFieldsValue({
        transportationId: metric.transportationId,
        costPerKm: metric.costPerKm,
        speedKmh: metric.speedKmh,
        maxRecommendedDistance: metric.maxRecommendedDistance,
      });
    } else {
      form.resetFields();
    }
  }, [metric, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        const { transportationId, ...updateData } = values;
        await updateLocalTransportMetricApi(metric.transportationId, updateData);
      } else {
        await createLocalTransportMetricApi(values);
      }
      onSuccess();
      onClose();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={<span className={styles.modalTitle}>{isEdit ? 'Edit Local Transport Metrics' : 'Create Local Transport Metrics'}</span>}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      className={styles.tropicalModal}
      okButtonProps={{ className: styles.modalSubmitBtn }}
      cancelButtonProps={{ className: styles.modalCancelBtn }}
      okText={isEdit ? 'Update' : 'Create'}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} className={styles.formContainer}>
        <Form.Item
          name="transportationId"
          label="Transport Mode"
          rules={[{ required: true, message: 'Please select transport mode' }]}
        >
          <Select
            showSearch
            placeholder="Select transport mode"
            optionFilterProp="label"
            disabled={isEdit}
            className={styles.selectField}
            options={(transportModes || []).map(t => ({ value: t.id, label: t.name }))}
          />
        </Form.Item>

        <Form.Item
          name="costPerKm"
          label="Cost per Km"
          rules={[{ required: true, message: 'Please enter cost per km' }]}
        >
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="e.g., 5000" className={styles.inputField} />
        </Form.Item>

        <Form.Item
          name="speedKmh"
          label="Speed (km/h)"
          rules={[{ required: true, message: 'Please enter speed' }]}
        >
          <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="e.g., 30" className={styles.inputField} />
        </Form.Item>

        <Form.Item
          name="maxRecommendedDistance"
          label="Max Recommended Distance (km)"
        >
          <InputNumber min={0} step={1} style={{ width: '100%' }} placeholder="Leave empty for unlimited" className={styles.inputField} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LocalTransportMetricsForm;