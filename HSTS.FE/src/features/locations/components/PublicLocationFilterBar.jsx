import React, { useEffect, useMemo } from 'react';
import { Button, Divider, Form, Input, InputNumber, Rate, Row, Col, Select, Space, Typography } from 'antd';

const { Text, Title } = Typography;
const fieldStyle = { marginBottom: 0 };
const fullWidth = { width: '100%' };
const DURATION_OPTIONS = [
  { value: 60, label: 'Up to 1 hour' },
  { value: 120, label: 'Up to 2 hours' },
  { value: 240, label: 'Up to 4 hours' },
  { value: 480, label: 'Up to 8 hours' },
];
const ratingMarks = {
  0: 'Any',
  4: '4.0+',
  5: '5.0',
};
const budgetInputProps = { min: 0, style: fullWidth };
const searchableSelectProps = { showSearch: true, optionFilterProp: 'label' };

const SectionHeading = ({ children }) => (
  <Title level={5} style={{ margin: 0 }}>{children}</Title>
);

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
  tags = [],
}) => {
  const [form] = Form.useForm();

  const destinationOptions = useMemo(() => destinations.map(normalizeOption).filter((item) => item.value), [destinations]);
  const districtOptions = useMemo(() => districts.map(normalizeOption).filter((item) => item.value), [districts]);
  const locationTypeOptions = useMemo(() => locationTypes.map(normalizeOption).filter((item) => item.value), [locationTypes]);
  const tagOptions = useMemo(() => tags.map(normalizeOption).filter((item) => item.value), [tags]);

  useEffect(() => {
    form.setFieldsValue({
      destinationId: initialValues?.destinationId ? String(initialValues.destinationId) : undefined,
      districtId: initialValues?.districtId ? String(initialValues.districtId) : undefined,
      locationTypeId: initialValues?.locationTypeId ? String(initialValues.locationTypeId) : undefined,
      keyword: initialValues?.keyword || '',
      tagIds: Array.isArray(initialValues?.tagIds) ? initialValues.tagIds.map(String) : [],
      minRating: initialValues?.minRating || 0,
      minBudget: initialValues?.minBudget,
      maxBudget: initialValues?.maxBudget,
      maxDurationMinutes: initialValues?.maxDurationMinutes,
    });
  }, [form, initialValues]);

  const handleSubmit = (values) => {
    onApply?.({
      destinationId: values.destinationId ? Number(values.destinationId) : undefined,
      districtId: values.districtId ? Number(values.districtId) : undefined,
      locationTypeId: values.locationTypeId ? Number(values.locationTypeId) : undefined,
      keyword: values.keyword?.trim() || '',
      tagIds: Array.isArray(values.tagIds) ? values.tagIds.map(Number) : [],
      minRating: values.minRating || 0,
      minBudget: values.minBudget,
      maxBudget: values.maxBudget,
      maxDurationMinutes: values.maxDurationMinutes,
    });
  };

  const handleReset = () => {
    const emptyValues = {
      destinationId: undefined,
      districtId: undefined,
      locationTypeId: undefined,
      keyword: '',
      tagIds: [],
      minRating: 0,
      minBudget: undefined,
      maxBudget: undefined,
      maxDurationMinutes: undefined,
    };
    form.setFieldsValue(emptyValues);
    onApply?.(emptyValues);
  };

  const handleDestinationChange = () => {
    form.setFieldValue('districtId', undefined);
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Space direction="vertical" size="large" style={fullWidth}>
        <div>
          <SectionHeading>Where do you want to explore?</SectionHeading>
          <Text type="secondary">Start with place and category, then narrow by interests, rating, budget, and visit time.</Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} lg={8}>
            <Form.Item label="Destination" name="destinationId" style={fieldStyle}>
              <Select placeholder="Select destination" options={destinationOptions} allowClear onChange={handleDestinationChange} {...searchableSelectProps} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item label="District" name="districtId" style={fieldStyle}>
              <Select placeholder="All districts" options={districtOptions} allowClear disabled={!form.getFieldValue('destinationId')} {...searchableSelectProps} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item label="Category" name="locationTypeId" style={fieldStyle}>
              <Select placeholder="All categories" options={locationTypeOptions} allowClear {...searchableSelectProps} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={12}>
            <Form.Item label="Keyword" name="keyword" style={fieldStyle}>
              <Input placeholder="Search by name, description, area..." allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={12}>
            <Form.Item label="Interests" name="tagIds" style={fieldStyle}>
              <Select mode="multiple" placeholder="Select interests" options={tagOptions} allowClear maxTagCount="responsive" {...searchableSelectProps} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: 0 }} />

        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} md={12} lg={8}>
            <Form.Item label="Minimum Rating" name="minRating" style={fieldStyle}>
              <Rate allowHalf />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={4}>
            <Form.Item label="Budget From (USD)" name="minBudget" style={fieldStyle}>
              <InputNumber placeholder="Min" {...budgetInputProps} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={4}>
            <Form.Item label="Budget To (USD)" name="maxBudget" style={fieldStyle}>
              <InputNumber placeholder="Max" {...budgetInputProps} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item label="Max Duration" name="maxDurationMinutes" style={fieldStyle}>
              <Select placeholder="Any duration" allowClear options={DURATION_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>

        <Space wrap>
          <Button type="primary" htmlType="submit" loading={loading}>Apply</Button>
          <Button onClick={handleReset} disabled={loading}>Reset</Button>
        </Space>
      </Space>
    </Form>
  );
};

export default PublicLocationFilterBar;
