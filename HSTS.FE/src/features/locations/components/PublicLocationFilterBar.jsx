import React, { useEffect, useMemo } from 'react';
import { Button, Form, Input, InputNumber, Rate, Row, Col, Select, Space, Tag, Typography } from 'antd';

const { Paragraph, Text, Title } = Typography;
const fieldStyle = { marginBottom: 0 };
const fullWidth = { width: '100%' };
const DURATION_OPTIONS = [
  { value: 60, label: 'Quick stop · under 1 hour' },
  { value: 120, label: 'Half-day mood · under 2 hours' },
  { value: 240, label: 'Slow explore · under 4 hours' },
  { value: 480, label: 'Day anchor · under 8 hours' },
];
const budgetInputProps = { min: 0, style: fullWidth };
const searchableSelectProps = { showSearch: true, optionFilterProp: 'label' };

const normalizeOption = (item) => ({
  value: String(item?.id ?? item?.Id ?? ''),
  label: item?.name || item?.Name || item?.englishName || item?.EnglishName || 'Unknown',
});

const PublicLocationFilterBar = ({
  initialValues,
  onApply,
  onPreviewChange,
  loading = false,
  destinations = [],
  districts = [],
  districtsLoading = false,
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

  const handleDestinationChange = (value) => {
    form.setFieldValue('districtId', undefined);

    const currentValues = form.getFieldsValue();
    onPreviewChange?.({
      destinationId: value ? Number(value) : undefined,
      districtId: undefined,
      locationTypeId: currentValues.locationTypeId ? Number(currentValues.locationTypeId) : undefined,
      keyword: currentValues.keyword?.trim() || '',
      tagIds: Array.isArray(currentValues.tagIds) ? currentValues.tagIds.map(Number) : [],
      minRating: currentValues.minRating || 0,
      minBudget: currentValues.minBudget,
      maxBudget: currentValues.maxBudget,
      maxDurationMinutes: currentValues.maxDurationMinutes,
    });
  };

  const handleDistrictFocus = () => {
    const currentValues = form.getFieldsValue();
    if (!currentValues.destinationId) return;

    onPreviewChange?.({
      destinationId: Number(currentValues.destinationId),
      districtId: currentValues.districtId ? Number(currentValues.districtId) : undefined,
      locationTypeId: currentValues.locationTypeId ? Number(currentValues.locationTypeId) : undefined,
      keyword: currentValues.keyword?.trim() || '',
      tagIds: Array.isArray(currentValues.tagIds) ? currentValues.tagIds.map(Number) : [],
      minRating: currentValues.minRating || 0,
      minBudget: currentValues.minBudget,
      maxBudget: currentValues.maxBudget,
      maxDurationMinutes: currentValues.maxDurationMinutes,
    });
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Space direction="vertical" size="large" style={fullWidth}>
        <div className="explore-filter-hero">
          <Tag color="gold" style={{ borderRadius: 999, paddingInline: 12, paddingBlock: 4, marginBottom: 12 }}>
            Discover faster
          </Tag>
          <Title level={4} style={{ marginBottom: 8 }}>Find places that actually fit the day you want</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 760 }}>
            Start with one search, then trim the results with just the filters that matter most.
          </Paragraph>
        </div>

        <div className="explore-search-shell">
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>What are you in the mood for?</Text>
          <Form.Item name="keyword" style={fieldStyle}>
            <Input placeholder="Search places, neighborhoods, or vibes like temple, brunch, sunset, local market..." allowClear size="large" />
          </Form.Item>
        </div>

        <div className="explore-refine-shell">
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>Refine the shortlist</Text>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <div className="explore-control-card">
                <Form.Item label="Destination" name="destinationId" style={fieldStyle}>
                  <Select placeholder="Anywhere" options={destinationOptions} allowClear onChange={handleDestinationChange} {...searchableSelectProps} />
                </Form.Item>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div className="explore-control-card">
                <Form.Item label="District" name="districtId" style={fieldStyle}>
                  <Select placeholder={districtsLoading ? 'Updating district options...' : 'Any district'} options={districtOptions} allowClear disabled={!form.getFieldValue('destinationId') || districtsLoading} loading={districtsLoading} onFocus={handleDistrictFocus} onDropdownVisibleChange={(open) => { if (open) handleDistrictFocus(); }} {...searchableSelectProps} />
                </Form.Item>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div className="explore-control-card">
                <Form.Item label="Place type" name="locationTypeId" style={fieldStyle}>
                  <Select placeholder="Any type" options={locationTypeOptions} allowClear {...searchableSelectProps} />
                </Form.Item>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div className="explore-control-card">
                <Form.Item label="Travel vibe" name="tagIds" style={fieldStyle}>
                  <Select mode="multiple" placeholder="Culture, food, hidden gems..." options={tagOptions} allowClear maxTagCount="responsive" {...searchableSelectProps} />
                </Form.Item>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} align="bottom" style={{ marginTop: 4 }}>
            <Col xs={24} md={10} lg={8}>
              <div className="explore-control-card">
                <Form.Item label="Traveler rating" name="minRating" style={fieldStyle}>
                  <Rate allowHalf />
                </Form.Item>
              </div>
            </Col>
            <Col xs={24} sm={12} md={7} lg={4}>
              <div className="explore-control-card">
                <Form.Item label="Min spend (USD)" name="minBudget" style={fieldStyle}>
                  <InputNumber placeholder="No min" {...budgetInputProps} />
                </Form.Item>
              </div>
            </Col>
            <Col xs={24} sm={12} md={7} lg={4}>
              <div className="explore-control-card">
                <Form.Item label="Max spend (USD)" name="maxBudget" style={fieldStyle}>
                  <InputNumber placeholder="No max" {...budgetInputProps} />
                </Form.Item>
              </div>
            </Col>
            <Col xs={24} md={10} lg={8}>
              <div className="explore-control-card">
                <Form.Item label="Visit length" name="maxDurationMinutes" style={fieldStyle}>
                  <Select placeholder="Any pace" allowClear options={DURATION_OPTIONS} />
                </Form.Item>
              </div>
            </Col>
          </Row>
        </div>

        <Space wrap size="middle" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space wrap size="middle">
            <Button type="primary" htmlType="submit" loading={loading} size="large">Show matching places</Button>
            <Button onClick={handleReset} disabled={loading} size="large">Clear</Button>
          </Space>
          <Text type="secondary">Tip: start broad, then only add filters when the list feels too wide.</Text>
        </Space>
      </Space>
    </Form>
  );
};

export default PublicLocationFilterBar;
