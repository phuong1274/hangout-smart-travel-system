import React from 'react';
import { Card, Progress, Space, Typography } from 'antd';

const { Text, Title } = Typography;

const RatioPanel = ({ title, value }) => {
  return (
    <Card>
      <Space direction="vertical" size="middle" align="center" style={{ width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>{title}</Title>
        <Progress type="dashboard" percent={Number(value || 0)} />
        <Text type="secondary">Processed review reports this month</Text>
      </Space>
    </Card>
  );
};

export default RatioPanel;
