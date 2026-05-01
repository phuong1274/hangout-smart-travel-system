import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select, message } from 'antd';
import { createDistrictApi, updateDistrictApi, getProvincesApi } from '../api';
import MapLinkInput from '@/components/MapLinkInput';
import styles from '../styles/DestinationForm.module.css';

const { Option } = Select;

const DistrictForm = ({ open, district, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [provinces, setProvinces] = React.useState([]);
  const [fetchingProvinces, setFetchingProvinces] = React.useState(false);

  const isEdit = !!district;

  useEffect(() => {
    const fetchProvinces = async () => {
      setFetchingProvinces(true);
      try {
        const data = await getProvincesApi();
        setProvinces(Array.isArray(data) ? data : []);
      } catch (error) {
      } finally {
        setFetchingProvinces(false);
      }
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (district) {
      form.setFieldsValue({
        name: district.name,
        englishName: district.englishName,
        latitude: district.latitude,
        longitude: district.longitude,
        provinceId: district.provinceId,
      });
    } else {
      form.resetFields();
    }
  }, [district, form]);

  const handleMapLinkParsed = ({ lat, lng }) => {
    if (lat != null) form.setFieldValue('latitude', lat);
    if (lng != null) form.setFieldValue('longitude', lng);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        await updateDistrictApi(district.id, values);
        message.success('District updated successfully');
      } else {
        await createDistrictApi(values);
        message.success('District created successfully');
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
      title={<span className={styles.modalTitle}>{isEdit ? 'Edit District' : 'Create District'}</span>}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      width={700}
      className={styles.tropicalModal}
      okButtonProps={{ className: styles.modalSubmitBtn }}
      cancelButtonProps={{ className: styles.modalCancelBtn }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} className={styles.formContainer}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="name"
              label="District Name"
              rules={[
                { required: true, message: 'Please enter district name' },
                { max: 200, message: 'District name cannot exceed 200 characters' }
              ]}
            >
              <Input placeholder="Enter district name" className={styles.inputField} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="englishName"
              label="English Name"
              rules={[
                { max: 200, message: 'English name cannot exceed 200 characters' }
              ]}
            >
              <Input placeholder="Enter English name" className={styles.inputField} />
            </Form.Item>
          </Col>
        </Row>

        <MapLinkInput onParsed={handleMapLinkParsed} />

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="latitude"
              label="Latitude"
            >
              <InputNumber
                className={styles.inputField}
                style={{ width: '100%' }}
                placeholder="e.g., 10.57"
                min={-90}
                max={90}
                step={0.000001}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="longitude"
              label="Longitude"
            >
              <InputNumber
                className={styles.inputField}
                style={{ width: '100%' }}
                placeholder="e.g., 105.17"
                min={-180}
                max={180}
                step={0.000001}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="provinceId"
              label="Province"
            >
              <Select
                placeholder="Select province"
                showSearch
                optionFilterProp="children"
                loading={fetchingProvinces}
                allowClear
                className={styles.selectField}
              >
                {provinces.map(province => (
                  <Option key={province.id} value={province.id}>
                    {province.name} {province.code ? `(${province.code})` : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default DistrictForm;