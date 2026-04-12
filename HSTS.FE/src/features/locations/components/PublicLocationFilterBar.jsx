import React, { useEffect } from 'react';
import { Button, Form, Input, Rate, Space, Typography } from 'antd';

const { Text } = Typography;

const PublicLocationFilterBar = ({ initialValues, onApply, loading = false }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({
      destinationId: initialValues?.destinationId || '',
      keyword: initialValues?.keyword || '',
      minRating: initialValues?.minRating || 0,
    });
  }, [form, initialValues]);

  const handleSubmit = (values) => {
    onApply?.({
      destinationId: values.destinationId?.trim() || '',
      keyword: values.keyword?.trim() || '',
      minRating: values.minRating || 0,
    });
  };

  const handleReset = () => {
    const emptyValues = { destinationId: '', keyword: '', minRating: 0 };
    form.setFieldsValue(emptyValues);
    onApply?.(emptyValues);
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Space wrap size="middle" align="end" style={{ width: '100%' }}>
        <Form.Item label="Destination ID" name="destinationId" style={{ minWidth: 180, marginBottom: 0 }}>
          <Input placeholder="e.g. 1" allowClear />
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
        Use filters to discover locations by destination, keyword, and quality.
      </Text>
    </Form>
  );
};

export default PublicLocationFilterBar;
