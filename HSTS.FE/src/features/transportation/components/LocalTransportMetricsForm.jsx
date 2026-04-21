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
        baseFare: metric.baseFare,
        baseDistance: metric.baseDistance,
        pricePerKm: metric.pricePerKm,
        longDistanceThreshold: metric.longDistanceThreshold,
        longDistancePricePerKm: metric.longDistancePricePerKm,
        congestionFeePerMinute: metric.congestionFeePerMinute,
        peakHourMultiplier: metric.peakHourMultiplier,
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
      width={700}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            name="baseFare"
            label="Base Fare (VND)"
            rules={[{ required: true, message: 'Please enter base fare' }]}
          >
            <InputNumber
              min={0}
              step={500}
              style={{ width: '100%' }}
              placeholder="e.g., 10,000"
              className={styles.inputField}
              formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ₫' : ''}
              parser={(value) => value.replace(/\s?₫|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="baseDistance"
            label="Base Distance (km)"
            rules={[{ required: true, message: 'Please enter base distance' }]}
          >
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="e.g., 2" className={styles.inputField} />
          </Form.Item>

          <Form.Item
            name="pricePerKm"
            label="Price per Km (VND)"
            rules={[{ required: true, message: 'Please enter price per km' }]}
          >
            <InputNumber
              min={0}
              step={500}
              style={{ width: '100%' }}
              placeholder="e.g., 5,000"
              className={styles.inputField}
              formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ₫' : ''}
              parser={(value) => value.replace(/\s?₫|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="speedKmh"
            label="Speed (km/h)"
            rules={[{ required: true, message: 'Please enter speed' }]}
          >
            <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="e.g., 30" className={styles.inputField} />
          </Form.Item>

          <Form.Item
            name="longDistanceThreshold"
            label="Long Distance Threshold (km)"
          >
            <InputNumber min={0} step={1} style={{ width: '100%' }} placeholder="e.g., 10" className={styles.inputField} />
          </Form.Item>

          <Form.Item
            name="longDistancePricePerKm"
            label="Long Distance Price per Km (VND)"
          >
            <InputNumber
              min={0}
              step={500}
              style={{ width: '100%' }}
              placeholder="e.g., 4,000"
              className={styles.inputField}
              formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ₫' : ''}
              parser={(value) => value.replace(/\s?₫|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="congestionFeePerMinute"
            label="Congestion Fee (VND/min)"
            rules={[{ required: true, message: 'Please enter congestion fee' }]}
          >
            <InputNumber
              min={0}
              step={100}
              style={{ width: '100%' }}
              placeholder="e.g., 500"
              className={styles.inputField}
              formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ₫' : ''}
              parser={(value) => value.replace(/\s?₫|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="peakHourMultiplier"
            label="Peak Hour Multiplier"
            rules={[{ required: true, message: 'Please enter peak hour multiplier' }]}
          >
            <InputNumber min={1} step={0.1} style={{ width: '100%' }} placeholder="e.g., 1.2" className={styles.inputField} />
          </Form.Item>

          <Form.Item
            name="maxRecommendedDistance"
            label="Max Recommended Distance (km)"
          >
            <InputNumber min={0} step={1} style={{ width: '100%' }} placeholder="Leave empty for unlimited" className={styles.inputField} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default LocalTransportMetricsForm;