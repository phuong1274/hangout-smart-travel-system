import React, { useEffect, useMemo } from 'react';
import { Button, Form, Input, Rate, Select, Space, Typography } from 'antd';

const { Text } = Typography;

const normalizeOption = (item) => ({
  value: String(item?.id ?? item?.Id ?? ''),
  label: item?.name || item?.Name || item?.englishName || item?.EnglishName || 'Unknown',
});

const PublicLocationFilterBar = ({
  initialValues,
  onApply,
  loading = false,
  destinations = [],
  districts = [],
  locationTypes = [],
}) => {
  const [form] = Form.useForm();

  const destinationOptions = useMemo(() => destinations.map(normalizeOption).filter((item) => item.value), [destinations]);
  const districtOptions = useMemo(() => districts.map(normalizeOption).filter((item) => item.value), [districts]);
  const locationTypeOptions = useMemo(() => locationTypes.map(normalizeOption).filter((item) => item.value), [locationTypes]);

  useEffect(() => {
    form.setFieldsValue({
      destinationId: initialValues?.destinationId ? String(initialValues.destinationId) : undefined,
      districtId: initialValues?.districtId ? String(initialValues.districtId) : undefined,
      locationTypeId: initialValues?.locationTypeId ? String(initialValues.locationTypeId) : undefined,
      keyword: initialValues?.keyword || '',
      minRating: initialValues?.minRating || 0,
    });
  }, [form, initialValues]);

  const handleSubmit = (values) => {
    onApply?.({
      destinationId: values.destinationId ? Number(values.destinationId) : undefined,
      districtId: values.districtId ? Number(values.districtId) : undefined,
      locationTypeId: values.locationTypeId ? Number(values.locationTypeId) : undefined,
      keyword: values.keyword?.trim() || '',
      minRating: values.minRating || 0,
    });
  };

  const handleReset = () => {
    const emptyValues = {
      destinationId: undefined,
      districtId: undefined,
      locationTypeId: undefined,
      keyword: '',
      minRating: 0,
    };
    form.setFieldsValue(emptyValues);
    onApply?.(emptyValues);
  };

  const handleDestinationChange = () => {
    form.setFieldValue('districtId', undefined);
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Space wrap size="middle" align="end" style={{ width: '100%' }}>
        <Form.Item label="Destination" name="destinationId" style={{ minWidth: 220, marginBottom: 0 }}>
          <Select placeholder="Select destination" options={destinationOptions} allowClear onChange={handleDestinationChange} showSearch optionFilterProp="label" />
        </Form.Item>

        <Form.Item label="District" name="districtId" style={{ minWidth: 220, marginBottom: 0 }}>
          <Select placeholder="All districts" options={districtOptions} allowClear disabled={!form.getFieldValue('destinationId')} showSearch optionFilterProp="label" />
        </Form.Item>

        <Form.Item label="Category" name="locationTypeId" style={{ minWidth: 220, marginBottom: 0 }}>
          <Select placeholder="All categories" options={locationTypeOptions} allowClear showSearch optionFilterProp="label" />
        </Form.Item>

        <Form.Item label="Keyword" name="keyword" style={{ minWidth: 260, marginBottom: 0 }}>
          <Input placeholder="Search by name, description, area..." allowClear />
        </Form.Item>

        <Form.Item label="Minimum Rating" name="minRating" style={{ minWidth: 180, marginBottom: 0 }}>
          <Rate allowHalf />
        </Form.Item>

        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>Apply</Button>
          <Button onClick={handleReset} disabled={loading}>Reset</Button>
        </Space>
      </Space>
      <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
        Discover locations by destination, district, category, keyword, and quality.
      </Text>
    </Form>
  );
};

export default PublicLocationFilterBar;
