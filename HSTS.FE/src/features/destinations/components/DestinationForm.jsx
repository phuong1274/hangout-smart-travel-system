import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select, message } from 'antd';
import { createDestinationApi, updateDestinationApi, getCountriesApi, getStatesApi } from '../api';

const { TextArea } = Input;
const { Option } = Select;

const DestinationForm = ({ open, destination, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [countries, setCountries] = React.useState([]);
  const [states, setStates] = React.useState([]);
  const [fetchingCountries, setFetchingCountries] = React.useState(false);
  const [fetchingStates, setFetchingStates] = React.useState(false);

  const isEdit = !!destination;

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      setFetchingCountries(true);
      try {
        const data = await getCountriesApi();
        setCountries(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch countries:', error);
      } finally {
        setFetchingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  // Fetch states when country changes
  useEffect(() => {
    const countryId = form.getFieldValue('countryId');
    if (countryId) {
      fetchStates(countryId);
    } else {
      setStates([]);
    }
  }, [countries]);

  const fetchStates = async (countryId) => {
    setFetchingStates(true);
    try {
      const data = await getStatesApi(countryId);
      setStates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch states:', error);
      setStates([]);
    } finally {
      setFetchingStates(false);
    }
  };

  const handleCountryChange = (countryId) => {
    form.setFieldsValue({ stateId: undefined });
    if (countryId) {
      fetchStates(countryId);
    } else {
      setStates([]);
    }
  };

  useEffect(() => {
    if (destination) {
      form.setFieldsValue({
        name: destination.name,
        englishName: destination.englishName,
        code: destination.code,
        latitude: destination.latitude,
        longitude: destination.longitude,
        stateId: destination.stateId,
        countryId: destination.countryId,
      });
      // Fetch states for the destination's country
      if (destination.countryId) {
        fetchStates(destination.countryId);
      }
    } else {
      form.resetFields();
      setStates([]);
    }
  }, [destination, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        await updateDestinationApi(destination.id, values);
        message.success('Destination updated successfully');
      } else {
        await createDestinationApi(values);
        message.success('Destination created successfully');
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
      title={isEdit ? 'Edit Destination' : 'Create Destination'}
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
              label="Destination Name"
              rules={[
                { required: true, message: 'Please enter destination name' },
                { max: 200, message: 'Destination name cannot exceed 200 characters' }
              ]}
            >
              <Input placeholder="Enter destination name" />
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
              name="code"
              label="Code"
              rules={[
                { max: 50, message: 'Code cannot exceed 50 characters' }
              ]}
            >
              <Input placeholder="e.g., AGG" />
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
              name="countryId"
              label="Country"
              rules={[
                { max: 50, message: 'Please select a country' }
              ]}
            >
              <Select
                placeholder="Select country"
                showSearch
                optionFilterProp="children"
                loading={fetchingCountries}
                onChange={handleCountryChange}
                allowClear
              >
                {countries.map(country => (
                  <Option key={country.id} value={country.id}>
                    {country.name} {country.code ? `(${country.code})` : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="stateId"
              label="State"
            >
              <Select
                placeholder="Select state"
                showSearch
                optionFilterProp="children"
                loading={fetchingStates}
                disabled={!form.getFieldValue('countryId')}
                allowClear
              >
                {states.map(state => (
                  <Option key={state.id} value={state.id}>
                    {state.name} {state.code ? `(${state.code})` : ''}
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

export default DestinationForm;
