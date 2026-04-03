import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select, message } from 'antd';
import { createDistrictApi, updateDistrictApi, getProvincesApi } from '../api';

const { TextArea } = Input;
const { Option } = Select;

const DistrictForm = ({ open, district, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [provinces, setProvinces] = React.useState([]);
  const [fetchingProvinces, setFetchingProvinces] = React.useState(false);

  const isEdit = !!district;

  // Fetch provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      setFetchingProvinces(true);
      try {
        const data = await getProvincesApi();
        setProvinces(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch provinces:', error);
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
      // Error handled by global interceptor, but you can add custom handling here if needed
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit District' : 'Create District'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      width={700}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="District Name"
              rules={[
                { required: true, message: 'Please enter district name' },
                { max: 200, message: 'District name cannot exceed 200 characters' }
              ]}
            >
              <Input placeholder="Enter district name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="englishName"
              label="English Name"
              rules={[
                { max: 200, message: 'English name cannot exceed 200 characters' }
              ]}
            >
              <Input placeholder="Enter English name" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="latitude"
              label="Latitude"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="e.g., 10.57"
                min={-90}
                max={90}
                step={0.000001}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="longitude"
              label="Longitude"
            >
              <InputNumber
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
          <Col span={12}>
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
